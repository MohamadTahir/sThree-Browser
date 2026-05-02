import { NextRequest } from "next/server";
import { ErrorResponse } from "./ErrorResponse";

export interface S3Request {
    bucketName: string;
    region: string;
    endpoint?: string | undefined;
    forcePathStyle: boolean;
    accessKey: string;
    secretKey: string;
}

export function validateS3Request(request: S3Request): ErrorResponse | null {

    if (!request.bucketName) {
        return {
            error: 'Missing required fields: bucketName',
            statusCode: 400,
        };
    }
    if (!request.region) {
        return {
            error: 'Missing required fields: region',
            statusCode: 400,
        };
    }

    if (typeof request.forcePathStyle !== "boolean") {
        return {
            error: "Missing or invalid field: forcePathStyle (must be true or false)",
            statusCode: 400,
        };
    }
    if (!request.accessKey) {
        return {
            error: 'Missing required fields: accessKey',
            statusCode: 400,
        };
    }
    if (!request.secretKey) {
        return {
            error: 'Missing required fields: secretKey',
            statusCode: 400,
        };
    }

    return null;
}

export function buildS3RequestQueryParams(request : NextRequest): S3Request {
    return {
        bucketName: request.nextUrl.searchParams.get("bucketName") ?? "",
        region: request.nextUrl.searchParams.get("region") ?? "",
        endpoint: request.nextUrl.searchParams.get("endpoint") || null,
        forcePathStyle: request.nextUrl.searchParams.get("forcePathStyle") === 'true',
        accessKey: request.headers.get("x-accessKey") ?? "",
        secretKey: request.headers.get("x-secretKey") ?? "",
    } as S3Request;
}
