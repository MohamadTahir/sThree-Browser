/**
 * S3 access, run entirely on the user's device.
 *
 * Every request is signed and sent from the browser (web) or from the Tauri
 * Rust layer (desktop). Access and secret keys never travel to the server
 * that hosts this app.
 */

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { Bucket, Credential, S3Object } from "@/models/types";
import { isTauri } from "@/lib/tauri";
import { TauriHttpHandler } from "@/lib/tauriHttpHandler";

/** S3 rejects presigned URLs (SigV4) valid for more than 7 days. */
export const MAX_PRESIGN_SECONDS = 7 * 24 * 60 * 60;

/** S3 multipart limits. */
const MIN_PART_SIZE = 5 * 1024 * 1024;
const MAX_PARTS = 10_000;
const UPLOAD_CONCURRENCY = 4;

/** Bytes read for an in-app text preview. */
export const TEXT_PREVIEW_BYTES = 256 * 1024;

export interface Connection {
  bucket: Bucket;
  credential: Credential;
}

export interface ObjectPage {
  objects: S3Object[];
  nextContinuationToken: string | null;
}

export interface ObjectHead {
  contentType: string;
  contentLength: number;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
}

function createClient({ bucket, credential }: Connection): S3Client {
  return new S3Client({
    region: bucket.region,
    endpoint: bucket.endpoint || undefined,
    forcePathStyle: bucket.forcePathStyle,
    credentials: {
      accessKeyId: credential.accessKey,
      secretAccessKey: credential.secretKey,
    },
    // Only send/verify checksums when the operation requires them; many
    // S3-compatible stores reject the newer default CRC32 trailers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    // Desktop: send through Rust (no CORS). Web: bypass the HTTP cache, so
    // object data never lands in the browser's disk cache and the cache can't
    // rewrite signed Range requests into conditional ones (which S3 rejects).
    requestHandler: isTauri()
      ? new TauriHttpHandler()
      : new FetchHttpHandler({ cache: "no-store" }),
  });
}

export async function listObjects(
  connection: Connection,
  options: {
    prefix: string;
    continuationToken?: string | null;
    maxKeys?: number;
    signal?: AbortSignal;
  },
): Promise<ObjectPage> {
  const client = createClient(connection);
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: connection.bucket.bucketName,
      Prefix: options.prefix || undefined,
      Delimiter: "/",
      MaxKeys: options.maxKeys ?? 200,
      ContinuationToken: options.continuationToken || undefined,
    }),
    { abortSignal: options.signal },
  );

  const objects: S3Object[] = [];
  for (const prefix of response.CommonPrefixes ?? []) {
    if (prefix.Prefix) {
      objects.push({
        key: prefix.Prefix,
        size: 0,
        lastModified: null,
        isFolder: true,
      });
    }
  }
  for (const object of response.Contents ?? []) {
    // Skip the zero-byte marker S3 consoles create for the folder itself.
    if (!object.Key || object.Key === options.prefix) {
      continue;
    }
    objects.push({
      key: object.Key,
      size: object.Size ?? 0,
      lastModified: object.LastModified?.toISOString() ?? null,
      isFolder: false,
    });
  }

  return {
    objects,
    nextContinuationToken: response.IsTruncated
      ? (response.NextContinuationToken ?? null)
      : null,
  };
}

export async function headObject(
  connection: Connection,
  key: string,
  signal?: AbortSignal,
): Promise<ObjectHead> {
  const client = createClient(connection);
  const response = await client.send(
    new HeadObjectCommand({ Bucket: connection.bucket.bucketName, Key: key }),
    { abortSignal: signal },
  );
  return {
    contentType: response.ContentType ?? "application/octet-stream",
    contentLength: response.ContentLength ?? 0,
    lastModified: response.LastModified?.toISOString() ?? null,
    etag: response.ETag ?? null,
    storageClass: response.StorageClass ?? null,
  };
}

export async function deleteObject(
  connection: Connection,
  key: string,
): Promise<void> {
  const client = createClient(connection);
  await client.send(
    new DeleteObjectCommand({ Bucket: connection.bucket.bucketName, Key: key }),
  );
}

export interface PrefixContents {
  keys: string[];
  totalBytes: number;
}

/** Every object under a prefix (recursively), including folder markers. */
export async function listPrefixContents(
  connection: Connection,
  prefix: string,
  signal?: AbortSignal,
): Promise<PrefixContents> {
  const client = createClient(connection);
  const keys: string[] = [];
  let totalBytes = 0;
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: connection.bucket.bucketName,
        Prefix: prefix,
        ContinuationToken: token,
      }),
      { abortSignal: signal },
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) {
        keys.push(object.Key);
        totalBytes += object.Size ?? 0;
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return { keys, totalBytes };
}

export interface FolderSummary {
  bytes: number;
  objects: number;
  /** Newest LastModified inside the folder, or null when it's empty. */
  lastModified: string | null;
  /** True when the scan stopped at the object limit, so totals are a floor. */
  partial: boolean;
}

/**
 * Total size, object count, and newest change for everything under a prefix.
 * S3 keeps no folder metadata, so this lists the contents; it stops after
 * `maxObjects` to keep huge folders cheap.
 */
export async function summarizeFolder(
  connection: Connection,
  prefix: string,
  options: { maxObjects?: number; signal?: AbortSignal } = {},
): Promise<FolderSummary> {
  const maxObjects = options.maxObjects ?? 10_000;
  const client = createClient(connection);
  let bytes = 0;
  let objects = 0;
  let newest = "";
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: connection.bucket.bucketName,
        Prefix: prefix,
        ContinuationToken: token,
      }),
      { abortSignal: options.signal },
    );
    for (const object of page.Contents ?? []) {
      // The empty "folder/" marker itself isn't content.
      if (object.Key === prefix && !object.Size) continue;
      bytes += object.Size ?? 0;
      objects += 1;
      const modified = object.LastModified?.toISOString() ?? "";
      if (modified > newest) newest = modified;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token && objects < maxObjects);
  return { bytes, objects, lastModified: newest || null, partial: token !== undefined };
}

/**
 * Delete many objects, 1,000 per request (the S3 maximum). Stops at the
 * first batch that reports failures so nothing is silently skipped.
 */
export async function deleteKeys(
  connection: Connection,
  keys: string[],
  onProgress?: (deleted: number) => void,
): Promise<void> {
  const client = createClient(connection);
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: connection.bucket.bucketName,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    const errors = result.Errors ?? [];
    deleted += batch.length - errors.length;
    onProgress?.(deleted);
    if (errors.length > 0) {
      const first = errors[0];
      const error = new Error(
        `${errors.length} object${errors.length === 1 ? "" : "s"} couldn't be deleted (${first.Code ?? "error"}: ${first.Key}).`,
      );
      error.name = first.Code ?? "DeleteError";
      throw error;
    }
  }
}

/** Create an empty "folder/" marker object so the prefix shows up in listings. */
export async function createFolder(
  connection: Connection,
  prefix: string,
): Promise<void> {
  const client = createClient(connection);
  await client.send(
    new PutObjectCommand({
      Bucket: connection.bucket.bucketName,
      Key: prefix.endsWith("/") ? prefix : `${prefix}/`,
      Body: new Uint8Array(0),
    }),
  );
}

/**
 * Presigned GET URL. With `downloadAs`, S3 serves the object with
 * `Content-Disposition: attachment` so the browser saves it instead of
 * rendering it.
 */
export async function getPresignedUrl(
  connection: Connection,
  key: string,
  expiresInSeconds: number,
  downloadAs?: string,
): Promise<string> {
  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 1 ||
    expiresInSeconds > MAX_PRESIGN_SECONDS
  ) {
    throw new Error("Link duration must be between 1 second and 7 days.");
  }

  const client = createClient(connection);
  const command = new GetObjectCommand({
    Bucket: connection.bucket.bucketName,
    Key: key,
    ResponseContentDisposition: downloadAs
      ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadAs)}`
      : undefined,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** First bytes of an object as text, for previews. */
export async function readTextPreview(
  connection: Connection,
  key: string,
  signal?: AbortSignal,
): Promise<string> {
  const client = createClient(connection);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: connection.bucket.bucketName,
      Key: key,
      Range: `bytes=0-${TEXT_PREVIEW_BYTES - 1}`,
    }),
    { abortSignal: signal },
  );
  return (await response.Body?.transformToString("utf-8")) ?? "";
}

export interface UploadHandle {
  done: Promise<void>;
  abort: () => Promise<void>;
}

/**
 * Upload a file with bounded concurrency. Multipart uploads are aborted on
 * failure so no orphaned parts are left behind to accrue storage charges.
 */
export function uploadFile(
  connection: Connection,
  key: string,
  file: File,
  onProgress?: (fraction: number) => void,
): UploadHandle {
  const partSize = Math.max(MIN_PART_SIZE, Math.ceil(file.size / MAX_PARTS));

  const upload = new Upload({
    client: createClient(connection),
    params: {
      Bucket: connection.bucket.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type || "application/octet-stream",
    },
    partSize,
    queueSize: UPLOAD_CONCURRENCY,
    leavePartsOnError: false,
  });

  upload.on("httpUploadProgress", ({ loaded, total }) => {
    const size = total ?? file.size;
    if (size > 0 && loaded != null) {
      onProgress?.(Math.min(loaded / size, 1));
    }
  });

  return {
    done: upload.done().then(() => undefined),
    abort: () => upload.abort(),
  };
}

/** Turn an SDK or network error into a message a person can act on. */
export function describeS3Error(error: unknown): string {
  const err = error as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const name = err?.name ?? "";
  const status = err?.$metadata?.httpStatusCode;

  switch (name) {
    case "AbortError":
      return "The request was cancelled.";
    case "InvalidAccessKeyId":
      return "The access key isn't recognised. Check the credential.";
    case "SignatureDoesNotMatch":
      return "The secret key doesn't match the access key. Check the credential.";
    case "AccessDenied":
    case "Forbidden":
      return "Access denied. The credential doesn't have permission for this action.";
    case "NoSuchBucket":
      return "The bucket doesn't exist. Check the bucket name and endpoint.";
    case "NoSuchKey":
    case "NotFound":
      return "The object no longer exists.";
    case "PermanentRedirect":
    case "AuthorizationHeaderMalformed":
    case "IllegalLocationConstraintException":
      return "The bucket is in a different region. Check the region setting.";
    case "RequestTimeTooSkewed":
      return "Your device clock is out of sync. Correct the system time and try again.";
    case "NetworkError":
    case "TypeError":
      return isTauri()
        ? "Couldn't reach the storage endpoint. Check the endpoint URL and your connection."
        : "Couldn't reach the storage endpoint. Check the endpoint URL, and that the bucket's CORS policy allows this site.";
  }

  if (status === 403) {
    return "Access denied. The credential doesn't have permission for this action.";
  }
  if (status === 404) {
    return "Not found. Check the bucket name, region, and endpoint.";
  }
  if (err?.message && err.message !== "UnknownError") {
    return err.message;
  }
  return "Something went wrong talking to the storage endpoint.";
}
