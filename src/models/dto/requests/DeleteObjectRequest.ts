import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Request, validateS3Request } from "../../S3";

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
