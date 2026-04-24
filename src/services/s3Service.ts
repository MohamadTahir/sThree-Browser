import { APIListObjectsRequest, ListObjectsRequest } from "@/models/dto/requests/ListObjectsRequest";
import { Bucket, BucketWithCredentials } from "../types";
import { APIGetObjectRequest, GetObjectRequest } from "@/models/dto/requests/GetObjectRequest";
import { GetObjectResponse } from "@/models/dto/responses/GetObjectResponse";
import { APIPreSignUrlRequest, PreSignUrlRequest } from "@/models/dto/requests/PreSignUrl";
import { APIDeleteObjectRequest, DeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { ListObjectsResponse } from "@/models/dto/responses/ListObjectResponse";
import { PreSignUrlResponse } from "@/models/dto/responses/PreSignUrl";
import { loadConfigsFromStorage } from "@/context/config";

const API_BASE_URL = 'http://localhost:1420';

// Helper to merge a bucket config with its resolved credentials (web mode)
async function withResolvedCredentials(bucket: Bucket): Promise<BucketWithCredentials> {
  const configs = await loadConfigsFromStorage();
  const credentialId = bucket.credentialId;

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
async function apiRequest<T>(endpoint: string, body: any): Promise<T> {
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
export async function listBuckets(bucket: Bucket): Promise<string[]> {
  try {
    const bucketWithCredentials = await withResolvedCredentials(bucket);
    const result = await apiRequest<any>('/api/s3/list-buckets', { config: bucketWithCredentials });
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

export async function listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse> {
  try {
    let apiListObjectsRequest: APIListObjectsRequest = {
      ...request,
      bucket: await withResolvedCredentials(request.bucket),
    }

    return await apiRequest<ListObjectsResponse>('/api/s3/list-objects', apiListObjectsRequest);

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

export async function getObjectContent(request: GetObjectRequest): Promise<Uint8Array> {
  try {
    let apiGetObjectRequest: APIGetObjectRequest = {
      ...request,
      bucket: await withResolvedCredentials(request.bucket),
    }

    const result = await apiRequest<GetObjectResponse>('/api/s3/get-object', apiGetObjectRequest);
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

export async function getPresignedUrl(request: PreSignUrlRequest): Promise<PreSignUrlResponse> {
  try {

    let apiPreSignUrlRequest: APIPreSignUrlRequest = {
      ...request,
      bucket: await withResolvedCredentials(request.bucket),
    }

    return await apiRequest<PreSignUrlResponse>('/api/s3/presigned-url', apiPreSignUrlRequest);
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate presigned URL");
  }
}

// export async function uploadFile(
//   config: Bucket,
//   bucketName: string,
//   key: string,
//   file: File,
//   onProgress?: (progress: number) => void,
//   bucketId?: string
// ): Promise<void> {
//   const presignedUrl = await getPresignedUrl(config, bucketName, key, 3600, bucketId);

//   // Perform the upload using XMLHttpRequest to track progress (fetch doesn't support upload progress yet easily)
//   return new Promise((resolve, reject) => {
//     const xhr = new XMLHttpRequest();
//     xhr.open('PUT', presignedUrl);
//     xhr.setRequestHeader('Content-Type', file.type);

//     if (onProgress) {
//       xhr.upload.onprogress = (event) => {
//         if (event.lengthComputable) {
//           const percentComplete = (event.loaded / event.total) * 100;
//           onProgress(percentComplete);
//         }
//       };
//     }

//     xhr.onload = () => {
//       if (xhr.status >= 200 && xhr.status < 300) {
//         resolve();
//       } else {
//         reject(new Error(`Upload failed with status ${xhr.status}`));
//       }
//     };

//     xhr.onerror = () => {
//       reject(new Error("Upload network error"));
//     };

//     xhr.send(file);
//   });
// }

export async function deleteObject(request: DeleteObjectRequest): Promise<void> {
  try {

    let apiDeleteObjectRequest: APIDeleteObjectRequest = {
      ...request,
      bucket: await withResolvedCredentials(request.bucket),
    }

    return await apiRequest<void>('/api/s3/delete-object', apiDeleteObjectRequest);
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete object");
  }
}
