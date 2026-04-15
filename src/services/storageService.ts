import { Bucket, Configs } from "../types";
import {
  encrypt,
  decrypt,
  getMasterPasswordFromMemory,
} from "./encryptionService";

const STORAGE_KEY = "bucket-configs";

export async function loadConfigs(): Promise<Configs> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
    }

    const encryptedConfigs: Configs = JSON.parse(stored);

    const masterPassword = getMasterPasswordFromMemory();
    if (!masterPassword) {
      return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
    }

    // Decrypt all credential configs
    const decryptedConfigs = { ...encryptedConfigs };

    for (const [credId, encryptedConfig] of Object.entries(encryptedConfigs.credentials || {})) {
      try {
        const decryptedAccessKey = await decrypt(
          encryptedConfig.access_key,
          masterPassword
        );

        const decryptedSecretKey = await decrypt(
          encryptedConfig.secret_key,
          masterPassword
        );

        decryptedConfigs.credentials[credId] = {
          id: encryptedConfig.id,
          name: encryptedConfig.name,
          access_key: decryptedAccessKey,
          secret_key: decryptedSecretKey,
        };
      } catch (error) {
        console.error(`Failed to decrypt credential for ${credId}:`, error);
      }
    }

    return decryptedConfigs;
  } catch (error) {
    console.error("Error loading configs:", error);
    // Fallback to empty configs if there's an error
    return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
  }
}

export async function saveConfigs(configs: Configs): Promise<void> {
  const masterPassword = getMasterPasswordFromMemory();
  if (!masterPassword) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  // Encrypt all credential configs
  const encryptedConfigs: Configs = {
    buckets: configs.buckets || {},
    credentials: {},
    groups: configs.groups || {},
    active_bucket: configs.active_bucket,
  };

  for (const [credId, cred] of Object.entries(configs.credentials || {})) {
    const encryptedAccessKey = await encrypt(
      cred.access_key,
      masterPassword
    );
    const encryptedSecretKey = await encrypt(
      cred.secret_key,
      masterPassword
    );

    encryptedConfigs.credentials[credId] = {
      id: cred.id,
      name: cred.name,
      access_key: encryptedAccessKey,
      secret_key: encryptedSecretKey,
    };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedConfigs));
}

export async function addBucket(bucket: Bucket): Promise<string> {
  const configs = await loadConfigs();

  const bucketId = `bucket_${Date.now()}`;

  configs.buckets[bucketId] = {
    ...bucket,
    group_id: bucket.group_id || null,
  };

  await saveConfigs(configs);
  return bucketId;
}

export async function updateBucket(bucketId: string, bucket: Bucket): Promise<void> {
  const configs = await loadConfigs();

  if (!configs.buckets[bucketId]) {
    throw new Error(`Bucket ${bucketId} not found`);
  }

  configs.buckets[bucketId] = {
    region: bucket.region,
    nickname: bucket.nickname,
    bucket_name: bucket.bucket_name,
    credential_id: bucket.credential_id,
    group_id: bucket.group_id || null,
    endpoint: bucket.endpoint || undefined,
  };

  await saveConfigs(configs);
}

export async function updateBucketGroup(bucketId: string, groupId: string | null): Promise<void> {
  const configs = await loadConfigs();
  if (!configs.buckets[bucketId]) {
    throw new Error(`Bucket ${bucketId} not found`);
  }

  configs.buckets[bucketId].group_id = groupId;
  await saveConfigs(configs);
}


export async function deleteBucket(bucketId: string): Promise<void> {
  const configs = await loadConfigs();
  delete configs.buckets[bucketId];
  if (configs.active_bucket === bucketId) {
    configs.active_bucket = null;
  }
  await saveConfigs(configs);
}

export async function setActiveBucket(bucketId: string | null): Promise<void> {
  const configs = await loadConfigs();
  configs.active_bucket = bucketId;
  await saveConfigs(configs);
}

// Group management functions
export async function createGroup(name: string, color?: string): Promise<void> {
  const configs = await loadConfigs();
  const groupId = `group_${Date.now()}`;

  configs.groups[groupId] = {
    id: groupId,
    name,
    color,
  };

  await saveConfigs(configs);
}

export async function updateGroup(groupId: string, name: string, color?: string): Promise<void> {
  const configs = await loadConfigs();

  if (!configs.groups[groupId]) {
    throw new Error(`Group ${groupId} not found`);
  }

  configs.groups[groupId] = {
    ...configs.groups[groupId],
    name,
    color,
  };

  await saveConfigs(configs);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const configs = await loadConfigs();

  delete configs.groups[groupId];

  // Remove group_id from all buckets in this group
  for (const bucketId in configs.buckets) {
    if (configs.buckets[bucketId].group_id === groupId) {
      configs.buckets[bucketId].group_id = null;
    }
  }

  await saveConfigs(configs);
}

