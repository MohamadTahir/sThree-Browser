import { Bucket, BucketWithCredentials } from "@/types";

export interface ListObjectsRequest {
    bucket: Bucket;
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
}


export interface APIListObjectsRequest {
    bucket: BucketWithCredentials;
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
}

