import { S3Object } from "@/types";

export interface ListObjectsResponse {
    objects: S3Object[];
    nextContinuationToken?: string | null;
    isTruncated: boolean;
}
