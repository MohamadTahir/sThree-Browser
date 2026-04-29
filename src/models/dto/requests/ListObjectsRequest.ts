import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Request, validateS3Request } from "../../S3";

export interface ListObjectsRequest extends S3Request {
    prefix?: string | null;
    maxKeys?: number | null;
    continuationToken?: string | null;
}

export function validateListObjectsRequest(request: ListObjectsRequest): ErrorResponse | null {
    const error = validateS3Request(request);
    if (error) {
        return error;
    }

    return null;
}
