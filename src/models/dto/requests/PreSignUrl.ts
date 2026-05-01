import { ErrorResponse } from "@/models/ErrorResponse";
import { buildS3RequestQueryParams, S3Request, validateS3Request } from "../../S3";
import { NextRequest } from "next/server";

export interface PreSignUrlRequest extends S3Request {
    key: string;
    expiresIn: number;
}

export function validatePreSignUrlRequest(request: PreSignUrlRequest): ErrorResponse | null {
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

    if (
        request.expiresIn == null ||
        !Number.isFinite(request.expiresIn) ||
        request.expiresIn <= 0
    ) {
        return {
            error: "Invalid or missing expiresIn",
            statusCode: 400,
        };
    }

    return null;
}

export function buildPreSignUrlRequest(request : NextRequest): PreSignUrlRequest {
    return {
        ...buildS3RequestQueryParams(request),
        key: request.nextUrl.searchParams.get("key") ?? "",
        expiresIn: request.nextUrl.searchParams.get("expiresIn") ? Number(request.nextUrl.searchParams.get("expiresIn")) : 3600,
    } as PreSignUrlRequest;
}
