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

    if (!request.forcePathStyle) {
        return {
            error: 'Missing required fields: forcePathStyle',
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
