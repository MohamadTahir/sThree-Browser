import { ErrorResponse } from "@/models/ErrorResponse";
import { buildS3RequestQueryParams, S3Request, validateS3Request } from "../../S3";
import { NextRequest } from "next/server";

export interface DeleteObjectRequest extends S3Request {
    key: string;
}

export function validateDeleteObjectRequest(request: DeleteObjectRequest): ErrorResponse | null {

    const error = validateS3Request(request);
    if (error) {
        return error;
    }

    if (!request.key) {
        return {
            error: 'Missing required fields: key',
            statusCode: 400,
        };
    }

    return null;
}

export function buildDeleteObjectRequest(request : NextRequest): DeleteObjectRequest {
    return {
        ...buildS3RequestQueryParams(request),
        key: request.nextUrl.searchParams.get("key") ?? "",
    } as DeleteObjectRequest;
}
