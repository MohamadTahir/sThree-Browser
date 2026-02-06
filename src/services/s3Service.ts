import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BucketConfig } from "../types";

// Cache S3 clients by bucket ID
const clientCache = new Map<string, S3Client>();

function createS3Client(config: BucketConfig): S3Client {
  // Create static credentials provider
  const credentials = async () => ({
    accessKeyId: config.access_key,
    secretAccessKey: config.secret_key,
  });

  const clientConfig: any = {
    region: config.region,
    credentials,
  };

  // Handle custom endpoint (for S3-compatible storage)
  // Only set endpoint if explicitly provided (AWS S3 uses default endpoints)
  if (config.endpoint && config.endpoint.trim()) {
    let endpoint = config.endpoint.trim();

    // Only add protocol if not already present
    // Allow both http:// and https:// - don't force HTTPS
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      // Default to https if no protocol specified
      // User can explicitly use http:// for local development
      endpoint = `https://${endpoint}`;
    }

    // Remove trailing slash
    endpoint = endpoint.replace(/\/$/, "");

    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true; // Required for S3-compatible storage
  }
  // If no endpoint is provided, AWS SDK will use default AWS S3 endpoints
  // based on the region, which is the correct behavior for AWS S3

  return new S3Client(clientConfig);
}

function getS3Client(config: BucketConfig): S3Client {
  // Use nickname as cache key (or could use bucket_id)
  const cacheKey = config.nickname;

  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createS3Client(config));
  }

  return clientCache.get(cacheKey)!;
}

export async function listBuckets(config: BucketConfig): Promise<string[]> {
  const client = getS3Client(config);
  const command = new ListBucketsCommand({});

  let response;
  try {
    response = await client.send(command);
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.name === "UnknownEndpoint" || error.message?.includes("UnknownEndpoint")) {
      throw new Error(`Invalid endpoint: ${config.endpoint}. Please check your endpoint URL.`);
    }
    if (error.name === "InvalidAccessKeyId" || error.message?.includes("InvalidAccessKeyId")) {
      throw new Error("Invalid access key. Please check your credentials.");
    }
    if (error.name === "SignatureDoesNotMatch" || error.message?.includes("SignatureDoesNotMatch")) {
      throw new Error("Invalid secret key. Please check your credentials.");
    }
    // Re-throw with original message if we can't provide a better one
    throw new Error(error.message || String(error));
  }

  if (!response.Buckets) {
    return [];
  }

  return response.Buckets.map(bucket => bucket.Name || "").filter(Boolean);
}

export interface ListObjectsOptions {
  bucketName: string;
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: string | null;
    isFolder: boolean;
  }>;
  commonPrefixes: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export async function listObjects(
  config: BucketConfig,
  options: ListObjectsOptions
): Promise<ListObjectsResult> {
  const client = getS3Client(config);
  const {
    bucketName,
    prefix = "",
    maxKeys = 100,
    continuationToken,
  } = options;

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix || undefined,
    Delimiter: "/",
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  });

  let response;
  try {
    response = await client.send(command);
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.name === "UnknownEndpoint" || error.message?.includes("UnknownEndpoint")) {
      throw new Error(`Invalid endpoint: ${config.endpoint}. Please check your endpoint URL.`);
    }
    if (error.name === "InvalidAccessKeyId" || error.message?.includes("InvalidAccessKeyId")) {
      throw new Error("Invalid access key. Please check your credentials.");
    }
    if (error.name === "SignatureDoesNotMatch" || error.message?.includes("SignatureDoesNotMatch")) {
      throw new Error("Invalid secret key. Please check your credentials.");
    }
    if (error.message?.includes("Failed to fetch") || error.message?.includes("CORS")) {
      throw new Error(
        `CORS error: Your S3 server at ${config.endpoint || "the configured endpoint"} needs to allow CORS requests from ${window.location.origin}. ` +
        `Please configure CORS on your server to allow requests from this origin.`
      );
    }
    // Re-throw with original message if we can't provide a better one
    throw new Error(error.message || String(error));
  }

  const objects: ListObjectsResult["objects"] = [];
  const commonPrefixes: string[] = [];

  // Process common prefixes (folders)
  if (response.CommonPrefixes) {
    for (const prefixObj of response.CommonPrefixes) {
      if (prefixObj.Prefix) {
        commonPrefixes.push(prefixObj.Prefix);
        objects.push({
          key: prefixObj.Prefix,
          size: 0,
          lastModified: null,
          isFolder: true,
        });
      }
    }
  }

  // Process objects
  if (response.Contents) {
    for (const obj of response.Contents) {
      if (obj.Key && !obj.Key.endsWith("/")) {
        // Skip if already included as a common prefix
        objects.push({
          key: obj.Key,
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || null,
          isFolder: false,
        });
      }
    }
  }

  return {
    objects,
    commonPrefixes,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated || false,
  };
}

export async function getObjectContent(
  config: BucketConfig,
  bucketName: string,
  key: string
): Promise<Uint8Array> {
  const client = getS3Client(config);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error("Empty response body");
  }

  // Convert stream to Uint8Array
  // AWS SDK v3 Body can be a ReadableStream, Blob, or other types
  const body = response.Body;

  if (body instanceof ReadableStream) {
    const chunks: Uint8Array[] = [];
    const reader = body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  } else if (body instanceof Blob) {
    const arrayBuffer = await body.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else {
    // Fallback: try to read as stream
    const stream = body as any;
    if (stream.transformToWebStream) {
      const webStream = stream.transformToWebStream();
      const reader = webStream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Last resort: try to convert to array buffer
    if (typeof (body as any).arrayBuffer === 'function') {
      const arrayBuffer = await (body as any).arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    throw new Error("Unsupported response body type");
  }
}

export async function getPresignedUrl(
  config: BucketConfig,
  bucketName: string,
  key: string,
  expiresIn: number = 3600 // Default 1 hour in seconds
): Promise<string> {
  const client = getS3Client(config);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate presigned URL");
  }
}
