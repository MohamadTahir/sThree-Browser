import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Request, validateS3Request } from "@/models/S3";

export interface InitUploadRequest extends S3Request {
  key: string;
  parts: number;
  contentType: string;
}

export function validateInitUploadRequest(
  request: InitUploadRequest,
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

  if (request.parts <= 0) {
    return {
      error: "Parts must be greater than 0",
      statusCode: 400,
    };
  }

  return null;
}
