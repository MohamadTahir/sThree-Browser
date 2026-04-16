export interface Configs {
  buckets: Record<string, Bucket>;
  credentials: Record<string, Credential>;
  groups: Record<string, Group>;
  active_bucket: string | null;
}

export interface Credential {
  id: string;
  name: string;
  access_key: string;
  secret_key: string;
}

export interface Bucket {
  nickname: string;
  bucket_name: string;
  region: string;
  endpoint?: string;
  credential_id: string;
  group_id?: string | null;
}

export interface BucketWithCredentials extends Bucket {
  access_key: string;
  secret_key: string;
}

export interface Group {
  id: string;
  name: string;
  color?: string;
  active?: boolean;
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
