import axios, { AxiosRequestHeaders, isAxiosError, RawAxiosRequestHeaders } from "axios";
import { ListObjectsRequest } from "@/models/dto/requests/ListObjectsRequest";
import { PreSignUrlRequest } from "@/models/dto/requests/PreSignUrl";
import { DeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { ListObjectsResponse } from "@/models/dto/responses/ListObjectResponse";
import { PreSignUrlResponse } from "@/models/dto/responses/PreSignUrl";
import { GetHeadObjectResponse } from "@/models/dto/responses/GetHeadObjectResponse";
import { DeleteObjectResponse } from "@/models/dto/responses/DeleteObjectResponse";
import { InitUploadRequest } from "@/models/dto/requests/InitUploadRequest";
import { InitUploadResponse } from "@/models/dto/responses/initUploadResponse";
import { CompleteUploadResponse } from "@/models/dto/responses/CompleteUplaodResponse";
import { CompleteUploadRequest, CompleteUploadPart } from "@/models/dto/requests/CompleteUploadRequest";
import { HeadObjectRequest } from "@/models/dto/requests/GetHeadObjectRequest";

const CHUNK_SIZE = 5 * 1024 * 1024;

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 120_000,
});

function isErrorPayload(value: unknown): value is { error?: string; statusCode?: number } {
  return typeof value === "object" && value !== null && "error" in value;
}

function requestToQueryParams(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(input)) {

    if (k === "accessKey" || k === "secretKey") {
      continue;
    }

    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "number") out[k] = v;
    else out[k] = String(v);
  }
  return out;
}


function setAccessKeyAndSecretKeyHeaders(accessKey: string, secretKey: string): Record<string, any> {
  return {
    "x-accessKey": accessKey,
    "x-secretKey": secretKey,
  };
}

async function apiRequestJson<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  headers: any,
  queryParams?: any,
  body?: unknown,
): Promise<T> {
  try {
    console.log(headers);
    const { data, status, statusText } = await apiClient.request<T>({
      method,
      url: path,
      baseURL: getApiBaseUrl(),
      data: body,
      params: queryParams,
      headers: headers,
      validateStatus: () => true,
    });

    if (status >= 400) {
      if (isErrorPayload(data) && data.error !== undefined) {
        return data as T;
      }
      return {
        error: statusText || `HTTP ${status}`,
        statusCode: status,
      } as T;
    }

    return data;
  } catch (err) {
    if (isAxiosError(err)) {
      const status = err.response?.status ?? 0;
      const payload = err.response?.data;
      if (isErrorPayload(payload) && payload.error !== undefined) {
        return payload as T;
      }
      return {
        error: err.message,
        statusCode: status || 500,
      } as T;
    }
    throw err;
  }
}

export async function listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse> {
  return apiRequestJson<ListObjectsResponse>("GET", "/api/s3/list-objects",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    requestToQueryParams({ ...request }),
);
}

export async function deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse> {
  return apiRequestJson<DeleteObjectResponse>("DELETE", "/api/s3/delete-object",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    requestToQueryParams({ ...request }),
  );
}

export async function getPresignedUrl(request: PreSignUrlRequest): Promise<PreSignUrlResponse> {
  return apiRequestJson<PreSignUrlResponse>("GET", "/api/s3/presigned-url",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    requestToQueryParams({ ...request }),
  );
}

export async function getHeadObject(request: HeadObjectRequest): Promise<GetHeadObjectResponse> {
  return apiRequestJson<GetHeadObjectResponse>("GET", "/api/s3/head-object",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    requestToQueryParams({ ...request }),
  );
}


export async function uploadFile(file: File, request: InitUploadRequest, onProgress?: (progress: number) => void): Promise<void> {
  const totalSize = file.size;
  const totalParts = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

  const initUploadRequest: InitUploadRequest = {
    bucketName: request.bucketName,
    key: request.key,
    contentType: file.type,
    parts: totalParts,
    region: request.region,
    forcePathStyle: request.forcePathStyle,
    accessKey: request.accessKey,
    secretKey: request.secretKey,
    endpoint: request.endpoint,
  };

  const initUploadResponse = await apiRequestJson<InitUploadResponse>("POST","/api/s3/upload/init",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    null,
    initUploadRequest,
  );

  if (initUploadResponse.error) {
    throw new Error(initUploadResponse.error);
  }
  if (!initUploadResponse.uploadId || !initUploadResponse.parts?.length) {
    throw new Error("Init upload failed: missing upload id or part URLs");
  }

  const partProgress: Record<number, number> = {};
  const progressDenominator = Math.max(totalSize, 1);

  const uploadPromises = initUploadResponse.parts.map((url: string, index: number) => {
    const partNumber = index + 1;
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const blob = file.slice(start, end);

    return axios
      .put(url, blob, {
        maxRedirects: 0,
        validateStatus: (s) => s === 200,
        onUploadProgress: (event) => {
          partProgress[partNumber] = event.loaded;
          const totalLoaded = Object.values(partProgress).reduce((a, b) => a + b, 0);
          const currentPercent = totalLoaded / progressDenominator;
          onProgress?.(currentPercent > 1 ? 1 : currentPercent);
        },
      })
      .then((res) => {
        const etag = res.headers.etag ?? res.headers.ETag ?? "";
        const uploadedPart: CompleteUploadPart = {
          ETag: etag,
          PartNumber: partNumber,
        };
        return uploadedPart;
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          throw new Error(
            `Part ${partNumber} upload failed${err.response?.status != null ? ` (HTTP ${err.response.status})` : ""}`,
          );
        }
        throw err;
      });
  });

  const uploadedParts = (await Promise.all(uploadPromises)).sort((a, b) => a.PartNumber - b.PartNumber);

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

  const completeUploadResponse = await apiRequestJson<CompleteUploadResponse>(
    "POST",
    "/api/s3/upload/complete",
    setAccessKeyAndSecretKeyHeaders(request.accessKey, request.secretKey),
    null,
    completeUploadRequest,
  );

  if (completeUploadResponse.error) {
    throw new Error(completeUploadResponse.error);
  }
}
