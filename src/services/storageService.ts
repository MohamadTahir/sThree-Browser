import { BucketConfig, Configs, CredentialConfig, Group } from "../types";
import {
  encrypt,
  decrypt,
  getMasterPasswordFromMemory,
  isMasterPasswordUnlocked,
} from "./encryptionService";

const STORAGE_KEY = "bucket-configs";

// Encrypted version of CredentialConfig (access_key and secret_key are encrypted)
interface EncryptedCredentialConfig {
  id: string;
  name: string;
  access_key: string; // Encrypted
  secret_key: string; // Encrypted
}

interface EncryptedBucketConfigs {
  // Buckets now reference credentials by ID
  buckets: Record<string, BucketConfig>;
  credentials: Record<string, EncryptedCredentialConfig>;
  groups: Record<string, Group>;
  active_bucket: string | null;
}

// Check if we're running in Tauri
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadConfigs(): Promise<Configs> {
  try {
    if (isTauri()) {
      // Use Tauri store for desktop (encryption handled in Rust)
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<Configs>("get_bucket_configs");
    } else {
      // Use localStorage for web (with encryption)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
      }

      const encryptedConfigs: EncryptedBucketConfigs = JSON.parse(stored);

      // Check if master password is unlocked
      if (!isMasterPasswordUnlocked()) {
        // Return encrypted configs (will need to be decrypted later)
        // For now, return empty to force password unlock
        return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
      }

      const masterPassword = getMasterPasswordFromMemory();
      if (!masterPassword) {
        return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
      }

      // Decrypt all credential configs
      const decryptedConfigs: Configs = {
        buckets: encryptedConfigs.buckets || {},
        credentials: {},
        groups: encryptedConfigs.groups || {},
        active_bucket: encryptedConfigs.active_bucket,
      };

      for (const [credId, encryptedConfig] of Object.entries(
        encryptedConfigs.credentials || {}
      )) {
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
          // Skip this credential if decryption fails
        }
      }

      return decryptedConfigs;
    }
  } catch (error) {
    console.error("Error loading configs:", error);
    // Fallback to empty configs if there's an error
    return { buckets: {}, credentials: {}, groups: {}, active_bucket: null };
  }
}

export async function saveConfigs(configs: Configs): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_full_config", { configs });
  } else {
    // Use localStorage for web (with encryption)
    const masterPassword = getMasterPasswordFromMemory();
    if (!masterPassword) {
      throw new Error("Master password not unlocked. Please unlock first.");
    }

    // Encrypt all credential configs
    const encryptedConfigs: EncryptedBucketConfigs = {
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
}

export async function addBucketConfig(config: BucketConfig): Promise<string> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    const bucketId = await invoke<string>("add_bucket_config", {
      nickname: config.nickname,
      bucketName: config.bucket_name,
      credentialId: config.credential_id,
      region: config.region,
      endpoint: config.endpoint || null,
    });
    // Assign to folder/group if selected on creation
    if (config.group_id) {
      await addBucketToGroup(bucketId, config.group_id);
    }
    return bucketId;
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();

    const bucketId = `bucket_${config.nickname.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    configs.buckets[bucketId] = {
      ...config,
      group_id: config.group_id || null,
    };
    if (!configs.credentials) {
      configs.credentials = {};
    }
    if (!configs.active_bucket) {
      configs.active_bucket = bucketId;
    }
    await saveConfigs(configs);
    return bucketId;
  }
}

export async function updateBucketConfig(bucketId: string, config: BucketConfig): Promise<void> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    // Note: group_id is handled separately for Tauri (Rust commands don't support it yet)
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_bucket_config", {
      bucketId,
      nickname: config.nickname,
      bucketName: config.bucket_name,
      credentialId: config.credential_id,
      region: config.region,
      endpoint: config.endpoint || null,
    });

    // Handle group_id separately for Tauri (if needed, update via addBucketToGroup)
    if (config.group_id !== undefined) {
      await addBucketToGroup(bucketId, config.group_id);
    }
  } else {
    // Use localStorage for web
    try {
      const configs = await loadConfigs();
      if (!configs.buckets[bucketId]) {
        throw new Error(`Bucket ${bucketId} not found`);
      }

      // Update the bucket config with all fields
      configs.buckets[bucketId] = {
        nickname: config.nickname,
        bucket_name: config.bucket_name,
        credential_id: config.credential_id,
        group_id: config.group_id || null,
        region: config.region,
        endpoint: config.endpoint || undefined,
      };

      await saveConfigs(configs);
    } catch (error) {
      console.error("Error in updateBucketConfig:", error);
      throw error;
    }
  }
}

export async function deleteBucketConfig(bucketId: string): Promise<void> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("delete_bucket_config", { bucketId });
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();
    delete configs.buckets[bucketId];
    if (configs.active_bucket === bucketId) {
      configs.active_bucket = null;
    }
    await saveConfigs(configs);
  }
}

export async function setActiveBucket(bucketId: string | null): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_active_bucket", { bucketId });
  } else {
    const configs = await loadConfigs();
    configs.active_bucket = bucketId;
    await saveConfigs(configs);
  }
}

// Group management functions
export async function createGroup(name: string, color?: string): Promise<string> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("create_group", {
      name,
      color: color || null,
    });
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();
    const groupId = `group_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

    configs.groups[groupId] = {
      id: groupId,
      name,
      color,
    };

    await saveConfigs(configs);
    return groupId;
  }
}

export async function updateGroup(groupId: string, name: string, color?: string): Promise<void> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_group", {
      groupId,
      name,
      color: color || null,
    });
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();
    if (configs.groups[groupId]) {
      configs.groups[groupId] = {
        ...configs.groups[groupId],
        name,
        color,
      };
      await saveConfigs(configs);
    }
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("delete_group", { groupId });
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();

    // Remove group
    delete configs.groups[groupId];

    // Remove group_id from all buckets in this group
    for (const bucketId in configs.buckets) {
      if (configs.buckets[bucketId].group_id === groupId) {
        configs.buckets[bucketId].group_id = null;
      }
    }

    await saveConfigs(configs);
  }
}

export async function addBucketToGroup(bucketId: string, groupId: string | null): Promise<void> {
  if (isTauri()) {
    // Use Tauri Rust command for desktop
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("add_bucket_to_group", {
      bucketId,
      groupId: groupId || null,
    });
  } else {
    // Use localStorage for web
    const configs = await loadConfigs();
    if (configs.buckets[bucketId]) {
      configs.buckets[bucketId].group_id = groupId;
      await saveConfigs(configs);
    }
  }
}
