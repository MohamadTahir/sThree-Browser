import { Configs } from "@/models/types";
import {
  deserializePersistedConfigs,
  isMasterPasswordUnlocked,
  serializePersistedConfigs,
} from "./encryptionService";

const STORAGE_KEY = "bucket-configs";

export async function loadConfigsFromStorage(): Promise<Configs> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
    }

    if (!isMasterPasswordUnlocked()) {
      return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
    }

    return await deserializePersistedConfigs(stored);
  } catch (error) {
    console.error("Error loading configs:", error);
    return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
  }
}

export async function persistConfigsToStorage(configs: Configs): Promise<void> {
  if (!isMasterPasswordUnlocked()) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  const payload = await serializePersistedConfigs(configs);
  localStorage.setItem(STORAGE_KEY, payload);
}
