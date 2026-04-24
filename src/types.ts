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
  id: string;
  nickname: string;
  bucketName: string;
  region: string;
  endpoint?: string | undefined;
  credentialId: string;
  groupId?: string | null;
  forcePathStyle: boolean;
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
  lastModified: string | null;
  isFolder: boolean;
}
