import { Bucket, BucketWithCredentials } from "@/types";

export interface PreSignUrlRequest {
    bucket: Bucket;
    key: string;
    expiresIn: number;
}

export interface APIPreSignUrlRequest {
    bucket: BucketWithCredentials;
    key: string;
    expiresIn: number;
}
