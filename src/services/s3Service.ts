import { ListObjectsRequest } from "@/models/dto/requests/ListObjectsRequest";
import { GetMimeTypeRequest } from "@/models/dto/requests/GetMimeTypeRequest";
import { PreSignUrlRequest } from "@/models/dto/requests/PreSignUrl";
import { DeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { ListObjectsResponse } from "@/models/dto/responses/ListObjectResponse";
import { PreSignUrlResponse } from "@/models/dto/responses/PreSignUrl";
import { GetMimeTypeResponse } from "@/models/dto/responses/GetMimeTypeResponse";
import { DeleteObjectResponse } from "@/models/dto/responses/DeleteObjectResponse";
import { InitUploadRequest } from "@/models/dto/requests/InitUploadRequest";
import { InitUploadResponse } from "@/models/dto/responses/initUploadResponse";
import { CompleteUploadResponse } from "@/models/dto/responses/CompleteUplaodRequest";
import { CompleteUploadRequest, CompleteUploadPart } from "@/models/dto/requests/CompleteUploadRequest";

const CHUNK_SIZE = 5 * 1024 * 1024;

const API_BASE_URL = 'http://localhost:1420';

// API request helpers (for web mode - Next.js API routes)
async function apiRequest<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return {
      error: response.statusText,
      statusCode: response.status,
    } as T;
  }

  return await response.json();
}

export async function listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse> {
  return await apiRequest<ListObjectsResponse>('/api/s3/list-objects', request);
}

export async function deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse> {
  return await apiRequest<DeleteObjectResponse>('/api/s3/delete-object', request);
}

export async function getPresignedUrl(request: PreSignUrlRequest): Promise<PreSignUrlResponse> {
  return await apiRequest<PreSignUrlResponse>('/api/s3/presigned-url', request);
}

export async function getMimeType(request: GetMimeTypeRequest): Promise<GetMimeTypeResponse> {
    return await apiRequest<GetMimeTypeResponse>('/api/s3/mime-type', request);
}


export async function uploadFile(file: File, request: InitUploadRequest, onProgress?: (progress: number) => void): Promise<void> {

  const totalSize = file.size;
  const totalParts = Math.ceil(totalSize / CHUNK_SIZE);

  const initUploadRequest: InitUploadRequest = {
    bucketName: request.bucketName,
    key: request.key,
    contentType: file.type,
    parts: totalParts,
    region:  request.region,
    forcePathStyle: request.forcePathStyle,
    accessKey: request.accessKey,
    secretKey: request.secretKey,
    endpoint: request.endpoint,
  };

  const initUploadResponse = await apiRequest<InitUploadResponse>('/api/s3/upload/init', initUploadRequest);


  if (initUploadResponse.error) {
    throw new Error(initUploadResponse.error);
  }

  const partProgress: Record<number, number> = {};

  const uploadPromises = initUploadResponse.parts.map((url: string, index: number) => {
    const partNumber = index + 1;
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const blob = file.slice(start, end);

    return new Promise<CompleteUploadPart>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);

      // Update progress for this specific part
      xhr.upload.onprogress = (event: ProgressEvent) => {
        partProgress[partNumber] = event.loaded;

        const totalLoaded = Object.values(partProgress).reduce((a, b) => a + b, 0);
        const currentPercent = totalLoaded / totalSize;
        onProgress?.(currentPercent > 1 ? 1 : currentPercent);
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const etag = xhr.getResponseHeader("ETag");
          const uploadedPart: CompleteUploadPart = {
            ETag: etag || "",
            PartNumber: partNumber,
          };
          resolve(uploadedPart);
        } else {
          reject();
        }
      };

      xhr.onerror = reject;
      xhr.send(blob);
    });
  });


  const uploadedParts = await Promise.all(uploadPromises);

  const completeUploadRequest: CompleteUploadRequest = {
    bucketName: request.bucketName,
    key: request.key,
    uploadId: initUploadResponse.uploadId,
    parts: uploadedParts,
    region: request.region,
    forcePathStyle: request.forcePathStyle,
    accessKey: request.accessKey,
    secretKey: request.secretKey,
    endpoint: request.endpoint,
  };

  const completeUploadResponse = await apiRequest<CompleteUploadResponse>('/api/s3/upload/complete', completeUploadRequest);

  if (completeUploadResponse.error) {
    throw new Error(completeUploadResponse.error);
  }
}
