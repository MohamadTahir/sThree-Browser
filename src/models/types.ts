export interface Configs {
  buckets: Record<string, Bucket>;
  credentials: Record<string, Credential>;
  groups: Record<string, Group>;
  activeBucket: string | null;
}

export interface Credential {
  id: string;
  name: string;
  accessKey: string;
  secretKey: string;
}

export interface Bucket {
  id: string;
  nickname: string;
  bucketName: string;
  region: string;
  endpoint?: string | undefined;
  /** Empty when `askForCredentials` is set. */
  credentialId: string;
  /** Prompt for keys on connect and keep them in memory only, never in the vault. */
  askForCredentials?: boolean;
  groupId?: string | null;
  /** Position within its group (or among ungrouped connections) in the sidebar. */
  order?: number;
  forcePathStyle: boolean;
}

export interface Group {
  id: string;
  name: string;
  color?: string;
  active?: boolean;
  /** Position among groups in the sidebar. */
  order?: number;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: string | null;
  isFolder: boolean;
}


export interface DeleteItem {
  name: string;
  id: string;
}

export function emptyConfigs(): Configs {
  return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
}
