import { Configs } from "@/models/types";
import { decrypt, encrypt, getMasterPasswordFromMemory } from "./encryptionService";

const STORAGE_KEY = "bucket-configs";

export async function loadConfigsFromStorage(): Promise<Configs> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
    }

    const masterPassword = getMasterPasswordFromMemory();
    if (!masterPassword) {
      return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
    }

    const decryptedConfigs = await decrypt(stored, masterPassword);
    return decryptedConfigs;
  } catch (error) {
    console.error("Error loading configs:", error);
    return { buckets: {}, credentials: {}, groups: {}, activeBucket: null };
  }
}

export async function persistConfigsToStorage(configs: Configs): Promise<void> {
  const masterPassword = getMasterPasswordFromMemory();

  if (!masterPassword) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  const encryptedConfigs = await encrypt(configs, masterPassword);
  localStorage.setItem(STORAGE_KEY, encryptedConfigs);
}
