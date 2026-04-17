import { Bucket, BucketWithCredentials } from "@/types";

export interface GetObjectRequest {
    bucket: Bucket;
    key: string;
}

export interface APIGetObjectRequest {
    bucket: BucketWithCredentials;
    key: string;
}
