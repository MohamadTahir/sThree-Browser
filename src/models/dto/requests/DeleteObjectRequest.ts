import { Bucket, BucketWithCredentials } from "@/types";

export interface DeleteObjectRequest {
    bucket: Bucket;
    key: string;
}

export interface APIDeleteObjectRequest {
    bucket: BucketWithCredentials;
    key: string;
}
