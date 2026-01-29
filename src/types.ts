export interface BucketConfig {
  nickname: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  region: string;
  endpoint?: string;
}

export interface BucketConfigs {
  buckets: Record<string, BucketConfig>;
  active_bucket: string | null;
}

export interface S3Object {
  key: string;
  size: number;
  last_modified: string | null;
  is_folder: boolean;
}

export interface ListObjectsResponse {
  objects: S3Object[];
  prefix: string;
  common_prefixes: string[];
  next_continuation_token?: string | null;
  is_truncated: boolean;
  max_keys: number;
}
