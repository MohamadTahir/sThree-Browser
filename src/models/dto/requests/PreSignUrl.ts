import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Request, validateS3Request } from "../../S3";

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

    if (!request.expiresIn) {
        return {
            error: 'Missing required fields: expiresIn',
            statusCode: 400,
        };
    }

    return null;
}
