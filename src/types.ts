export interface BucketConfig {
  nickname: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  region: string;
  endpoint?: string;
  group_id?: string | null; // ID of the group this bucket belongs to
}

export interface Group {
  id: string;
  name: string;
  color?: string; // Optional color for visual distinction
}

export interface BucketConfigs {
  buckets: Record<string, BucketConfig>;
  groups: Record<string, Group>;
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
