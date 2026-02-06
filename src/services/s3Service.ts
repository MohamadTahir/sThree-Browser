import { BucketConfig } from "../types";
import { isTauri } from "./encryptionService";

// Proxy server URL (for web mode)
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

// Helper to get bucketId from config (for Tauri mode)
async function getBucketIdFromConfig(config: BucketConfig): Promise<string> {
  const { loadConfigs } = await import("./storageService");
  const configs = await loadConfigs();
  
  const bucketId = Object.keys(configs.buckets).find(
    id => configs.buckets[id].nickname === config.nickname
  );
  
  if (!bucketId) {
    throw new Error("Bucket configuration not found");
  }
  
  return bucketId;
}

// Proxy API helpers (for web mode)
async function proxyRequest(endpoint: string, body: any): Promise<any> {
  try {
    const response = await fetch(`${PROXY_URL}${endpoint}`, {
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
    // Handle network errors (proxy server not running, CORS, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Failed to connect to proxy server at ${PROXY_URL}. ` +
        `Make sure the proxy server is running (npm run dev:proxy). ` +
        `Original error: ${error.message}`
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
}

export async function listBuckets(config: BucketConfig): Promise<string[]> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const result = await proxyRequest('/api/s3/list-buckets', { config });
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
    const bucketId = await getBucketIdFromConfig(config);
    const buckets = await invoke<string[]>("list_buckets", { bucketId });
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
  config: BucketConfig,
  options: ListObjectsOptions
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
      console.log('Proxy request - listObjects:', {
        nickname: config.nickname,
        bucketName,
        configBucketName: config.bucket_name,
        prefix,
      });
      const result = await proxyRequest('/api/s3/list-objects', {
        config,
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
    const bucketId = await getBucketIdFromConfig(config);
    
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
      bucketId,
      bucketName,
      prefix: prefix || null,
      maxKeys: maxKeys || null,
      continuationToken: continuationToken || null,
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
  config: BucketConfig,
  bucketName: string,
  key: string
): Promise<Uint8Array> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const result = await proxyRequest('/api/s3/get-object', {
        config,
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
    const bucketId = await getBucketIdFromConfig(config);
    
    const response = await invoke<{ data: string; size: number }>("get_object_content", {
      bucketId,
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

export async function getPresignedUrl(
  config: BucketConfig,
  bucketName: string,
  key: string,
  expiresIn: number = 3600 // Default 1 hour in seconds
): Promise<string> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      const result = await proxyRequest('/api/s3/presigned-url', {
        config,
        bucketName,
        key,
        expiresIn,
      });
      return result.url;
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate presigned URL");
    }
  }

  // Tauri mode: use Rust backend
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const bucketId = await getBucketIdFromConfig(config);
    
    const url = await invoke<string>("get_presigned_url", {
      bucketId,
      bucketName,
      key,
      expiresIn,
    });
    
    return url;
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate presigned URL");
  }
}

export async function deleteObject(
  config: BucketConfig,
  bucketName: string,
  key: string,
  deleteAllVersions: boolean = false
): Promise<void> {
  // Use proxy for web, Tauri commands for desktop
  if (!isTauri()) {
    try {
      await proxyRequest('/api/s3/delete-object', {
        config,
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
    const bucketId = await getBucketIdFromConfig(config);
    
    await invoke("delete_object", {
      bucketId,
      bucketName,
      key,
      deleteAllVersions,
    });
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete object");
  }
}
