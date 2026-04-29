import { ErrorResponse } from "@/models/ErrorResponse";
import { S3Object } from "@/models/types";

export interface ListObjectsResponse extends ErrorResponse {
    objects: S3Object[];
    nextContinuationToken?: string | null;
    isTruncated: boolean;
}
