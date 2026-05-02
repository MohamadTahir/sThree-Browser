import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Request, validateS3Request } from "@/models/S3";

export interface CompleteUploadRequest extends S3Request {
  key: string;
  uploadId: string;
  parts: CompleteUploadPart[];
}


export interface CompleteUploadPart {
  ETag: string;
  PartNumber: number;
}


export function validateCompleteUploadRequest(
  request: CompleteUploadRequest,
): ErrorResponse | null {
  const error = validateS3Request(request);
  if (error) {
    return error;
  }

  if (!request.key) {
    return {
      error: "Missing required fields: key",
      statusCode: 400,
    };
  }

  if (!request.uploadId) {
    return {
      error: "Missing required fields: uploadId",
      statusCode: 400,
    };
  }

  if (!request.parts) {
    return {
      error: "Missing required fields: parts",
      statusCode: 400,
    };
  }

  return null;
}
