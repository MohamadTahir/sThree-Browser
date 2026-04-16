import { Bucket, BucketWithCredentials } from "../types";
import { isTauri } from "./encryptionService";
import { loadConfigs } from "./storageService";

// API base URL (for web mode - Next.js API routes)
// In Next.js, API routes are relative to the same origin, so we can use relative paths
const API_BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:1420';

// Helper to resolve bucketId for Tauri mode (use provided bucketId or look up by nickname; with duplicate names, bucketId must be provided)
async function resolveBucketId(config: Bucket, bucketId?: string): Promise<string> {
  if (bucketId) return bucketId;
  const configs = await loadConfigs();
  const id = Object.keys(configs.buckets).find(
    (id) => configs.buckets[id].nickname === config.nickname
  );
  if (!id) throw new Error("Bucket configuration not found");
  return id;
}

// Helper to merge a bucket config with its resolved credentials (web mode)
async function withResolvedCredentials(bucket: Bucket): Promise<BucketWithCredentials> {
  const configs = await loadConfigs();
  const credentialId = bucket.credential_id;

  if (!credentialId) {
    throw new Error("No credential ID associated with this bucket");
  }

  const credential = configs.credentials?.[credentialId];

  if (!credential) {
    throw new Error(`Credentials (ID: ${credentialId}) not found for this bucket`);
  }

  return {
    ...bucket,
    access_key: credential.access_key,
    secret_key: credential.secret_key,
  };
}

// API request helpers (for web mode - Next.js API routes)
async function apiRequest(endpoint: string, body: any): Promise<any> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      if (isJson) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try to get text
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
      } else {
        // Not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch (e) {
          // Ignore text parsing errors
        }
      }

      throw new Error(errorMessage);
    }

    if (!isJson) {
      const text = await response.text();
      throw new Error(`Expected JSON response but got: ${contentType || 'unknown type'}. Response: ${text.substring(0, 100)}`);
    }

    return await response.json();
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Failed to connect to API server. ` +
        `Make sure Next.js dev server is running (pnpm run dev). ` +
        `Original error: ${error.message}`
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
}

// TODO: Why would I need to list buckets?
export async function listBuckets(config: Bucket, bucketId?: string): Promise<string[]> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const fullConfig = await withResolvedCredentials(config);
      const result = await apiRequest('/api/s3/list-buckets', { config: fullConfig });
      return result.buckets || [];
    } catch (error: any) {
      // Provide helpful error messages
      if (error.message?.includes("InvalidAccessKeyId")) {
        throw new Error("Invalid access key. Please check your credentials.");
      }
      if (error.message?.includes("SignatureDoesNotMatch")) {
        throw new Error("Invalid secret key. Please check your credentials.");
      }
      throw error;
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resolvedBucketId = await resolveBucketId(config, bucketId);
    const buckets = await invoke<string[]>("list_buckets", { bucketId: resolvedBucketId });
    return buckets;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    // Provide helpful error messages
    if (errorMsg.includes("InvalidAccessKeyId")) {
      throw new Error("Invalid access key. Please check your credentials.");
    }
    if (errorMsg.includes("SignatureDoesNotMatch")) {
      throw new Error("Invalid secret key. Please check your credentials.");
    }
    throw new Error(errorMsg);
  }
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
  config: Bucket,
  options: ListObjectsOptions,
  bucketId?: string
): Promise<ListObjectsResult> {
  const {
    bucketName,
    prefix = "",
    maxKeys = 100,
    continuationToken,
  } = options;

  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const fullConfig = await withResolvedCredentials(config);
      const result = await apiRequest('/api/s3/list-objects', {
        config: fullConfig,
        bucketName,
        prefix,
        maxKeys,
        continuationToken,
      });
      return {
        objects: result.objects || [],
        commonPrefixes: result.commonPrefixes || [],
        nextContinuationToken: result.nextContinuationToken,
        isTruncated: result.isTruncated || false,
      };
    } catch (error: any) {
      // Provide helpful error messages
      if (error.message?.includes("InvalidAccessKeyId")) {
        throw new Error("Invalid access key. Please check your credentials.");
      }
      if (error.message?.includes("SignatureDoesNotMatch")) {
        throw new Error("Invalid secret key. Please check your credentials.");
      }
      throw error;
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resolvedBucketId = await resolveBucketId(config, bucketId);
    // Always pass a valid bucket name: use config.bucket_name so we never send empty/undefined (causes S3 InvalidBucketName)
    const resolvedBucketName = bucketName ?? config.bucket_name ?? "";

    const response = await invoke<{
      objects: Array<{
        key: string;
        size: number;
        last_modified: string | null;
        is_folder: boolean;
      }>;
      common_prefixes: string[];
      next_continuation_token: string | null;
      is_truncated: boolean;
    }>("list_objects", {
      bucketId: resolvedBucketId,
      bucketName: resolvedBucketName,
      prefix: prefix ?? "",
      maxKeys: maxKeys ?? undefined,
      continuationToken: continuationToken ?? undefined,
    });

    return {
      objects: response.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        lastModified: obj.last_modified,
        isFolder: obj.is_folder,
      })),
      commonPrefixes: response.common_prefixes,
      nextContinuationToken: response.next_continuation_token || undefined,
      isTruncated: response.is_truncated,
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    // Provide helpful error messages
    if (errorMsg.includes("InvalidAccessKeyId")) {
      throw new Error("Invalid access key. Please check your credentials.");
    }
    if (errorMsg.includes("SignatureDoesNotMatch")) {
      throw new Error("Invalid secret key. Please check your credentials.");
    }
    throw new Error(errorMsg);
  }
}

export async function getObjectContent(
  config: Bucket,
  bucketName: string,
  key: string,
  bucketId?: string
): Promise<Uint8Array> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const fullConfig = await withResolvedCredentials(config);
      const result = await apiRequest('/api/s3/get-object', {
        config: fullConfig,
        bucketName,
        key,
      });
      // Convert base64 to Uint8Array
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get object");
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resolvedBucketId = await resolveBucketId(config, bucketId);

    const response = await invoke<{ data: string; size: number }>("get_object_content", {
      bucketId: resolvedBucketId,
      bucketName,
      key,
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(response.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get object");
  }
}

// Updated signature to support PUT/upload URLs
export async function getPresignedUrl(
  config: Bucket,
  bucketName: string,
  key: string,
  expiresIn: number = 3600, // Default 1 hour in seconds
  method: 'GET' | 'PUT' = 'GET',
  contentType?: string,
  bucketId?: string
): Promise<string> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const fullConfig = await withResolvedCredentials(config);
      // Construct endpoint based on method
      const endpoint = method === 'PUT' ? '/api/s3/presigned-url-put' : '/api/s3/presigned-url';

      const body: any = {
        config: fullConfig,
        bucketName,
        key,
        expiresIn,
      };

      if (method === 'PUT' && contentType) {
        body.contentType = contentType;
      }

      const result = await apiRequest(endpoint, body);
      return result.url;
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate presigned URL");
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resolvedBucketId = await resolveBucketId(config, bucketId);

    const url = await invoke<string>("get_presigned_url", {
      bucketId: resolvedBucketId,
      bucketName,
      key,
      expiresIn,
      method,
      contentType
    });

    return url;
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate presigned URL");
  }
}

export async function uploadFile(
  config: Bucket,
  bucketName: string,
  key: string,
  file: File,
  onProgress?: (progress: number) => void,
  bucketId?: string
): Promise<void> {
  const presignedUrl = await getPresignedUrl(config, bucketName, key, 3600, 'PUT', file.type, bucketId);

  // Perform the upload using XMLHttpRequest to track progress (fetch doesn't support upload progress yet easily)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload network error"));
    };

    xhr.send(file);
  });
}

export async function deleteObject(
  config: Bucket,
  bucketName: string,
  key: string,
  deleteAllVersions: boolean = false,
  bucketId?: string
): Promise<void> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const fullConfig = await withResolvedCredentials(config);
      await apiRequest('/api/s3/delete-object', {
        config: fullConfig,
        bucketName,
        key,
        deleteAllVersions,
      });
      return;
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete object");
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resolvedBucketId = await resolveBucketId(config, bucketId);

    await invoke("delete_object", {
      bucketId: resolvedBucketId,
      bucketName,
      key,
      deleteAllVersions,
    });
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete object");
  }
}
