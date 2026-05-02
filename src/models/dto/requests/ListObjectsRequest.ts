import { ErrorResponse } from "@/models/ErrorResponse";
import { buildS3RequestQueryParams, S3Request, validateS3Request } from "../../S3";
import { NextRequest } from "next/server";

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

export function buildListObjectsRequest(request : NextRequest): ListObjectsRequest {
    return {
        ...buildS3RequestQueryParams(request),
        prefix: request.nextUrl.searchParams.get("prefix") || null,
        maxKeys: request.nextUrl.searchParams.get("maxKeys") ? Number(request.nextUrl.searchParams.get("maxKeys")) : null,
        continuationToken: request.nextUrl.searchParams.get("continuationToken") || null,
    } as ListObjectsRequest;
}
