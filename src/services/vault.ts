/**
 * Encrypted local vault for connection settings and credentials.
 *
 * The whole config (credentials, bucket names, endpoints, folders) is one
 * AES-256-GCM ciphertext, keyed from the master password with scrypt. The key
 * is held only in memory as a non-extractable CryptoKey. Unlocking means
 * successfully decrypting the vault; there is no separate password hash that
 * could be attacked more cheaply than the data itself.
 *
 * Format v4 (desktop): the key is HKDF over the scrypt output and a random
 * device key kept in the OS keychain, so a copy of the stored vault can't be
 * attacked offline without that keychain item as well.
 * Format v3 (web build, or when the keychain can't be used): password only.
 *
 * v3 data is upgraded to v4 on unlock when the keychain works. Older v2 data
 * (scrypt verifier + PBKDF2 key, only keys encrypted) is migrated on the first
 * successful unlock.
 */

import { scryptAsync } from "@noble/hashes/scrypt.js";
import { Configs, Credential, emptyConfigs } from "@/models/types";
import { vaultDeviceKey } from "@/lib/tauri";

const VAULT_STORAGE_KEY = "sthree-vault";

/** v2 storage keys, read only for migration. */
const LEGACY_VERIFIER_KEY = "s3browser_master_password_hash";
const LEGACY_CONFIGS_KEY = "bucket-configs";

const SCRYPT = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
export const IV_BYTES = 12;
/** Binds the ciphertext to its format so it can't be swapped for another blob. */
const AAD = {
  3: new TextEncoder().encode("sthree-vault-v3"),
  4: new TextEncoder().encode("sthree-vault-v4"),
} as const;
const HKDF_INFO = new TextEncoder().encode("sthree-vault-v4 device key");

export const MIN_PASSWORD_LENGTH = 12;

export interface KdfParams {
  name: "scrypt";
  N: number;
  r: number;
  p: number;
  salt: string;
}

type VaultVersion = 3 | 4;

interface VaultFile {
  v: VaultVersion;
  kdf: KdfParams;
  iv: string;
  ct: string;
  /** Incremented on every write; lets a tab detect writes by other tabs. */
  rev?: number;
}

let sessionKey: CryptoKey | null = null;
let sessionKdf: VaultFile["kdf"] | null = null;
let sessionVersion: VaultVersion = 3;
/** Revision of the vault this tab last read or wrote. */
let sessionRev = 0;

/**
 * Another window changed the stored vault since this tab last read it.
 * "rekeyed": the password changed or the vault was reset, so this tab's key
 * is stale and must never write again. "changed": same key, newer settings.
 */
export class VaultConflictError extends Error {
  constructor(readonly kind: "rekeyed" | "changed") {
    super(
      kind === "rekeyed"
        ? "The vault was changed in another window."
        : "Your settings were changed in another window.",
    );
    this.name = "VaultConflictError";
  }
}

function adoptSession(key: CryptoKey, file: VaultFile): void {
  sessionKey = key;
  sessionKdf = file.kdf;
  sessionVersion = file.v;
  sessionRev = file.rev ?? 0;
}

// ---------------------------------------------------------------------------
// Encoding helpers

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

// ---------------------------------------------------------------------------
// Key derivation and AES-GCM

/** An AES-GCM key from the password alone (exports, v3 vaults). */
export function deriveKey(password: string, kdf: VaultFile["kdf"]): Promise<CryptoKey> {
  return deriveVaultKey(password, kdf, null);
}

/**
 * An AES-GCM key from the password, bound to `deviceKey` when given: HKDF
 * over the scrypt output and the device key, so neither alone is enough.
 */
async function deriveVaultKey(
  password: string,
  kdf: VaultFile["kdf"],
  deviceKey: Uint8Array | null,
): Promise<CryptoKey> {
  const raw = await scryptAsync(password.normalize("NFKC"), base64ToBytes(kdf.salt), {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    dkLen: KEY_BYTES,
  });
  const usages: KeyUsage[] = ["encrypt", "decrypt"];
  if (!deviceKey) {
    try {
      return await crypto.subtle.importKey("raw", new Uint8Array(raw), "AES-GCM", false, usages);
    } finally {
      raw.fill(0);
    }
  }
  const ikm = new Uint8Array(raw.length + deviceKey.length);
  ikm.set(raw);
  ikm.set(deviceKey, raw.length);
  raw.fill(0);
  try {
    const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: base64ToBytes(kdf.salt), info: HKDF_INFO },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      usages,
    );
  } finally {
    ikm.fill(0);
  }
}

/**
 * The device key a v4 vault needs. Throws with a message for the unlock
 * screen when the keychain can't be read or the key is gone.
 */
async function requireDeviceKey(): Promise<Uint8Array> {
  let key: Uint8Array | null;
  try {
    key = await vaultDeviceKey(false);
  } catch (error) {
    throw new Error(`Couldn't read the vault key from the system keychain: ${String(error)}`);
  }
  if (!key) {
    throw new Error(
      "This vault is tied to this device's keychain, and its key is missing there. " +
        "Restore your settings from an export, or reset the vault.",
    );
  }
  return key;
}

/**
 * Encrypt `configs` under a new salt and, where the keychain works, the
 * device key (v4). With `requireDevice`, a keychain failure throws instead of
 * falling back to a password-only v3 vault.
 */
async function sealNew(
  password: string,
  configs: Configs,
  rev: number,
  requireDevice: boolean,
): Promise<{ key: CryptoKey; file: VaultFile }> {
  let deviceKey: Uint8Array | null = null;
  try {
    deviceKey = await vaultDeviceKey(true);
  } catch (error) {
    if (requireDevice) {
      throw new Error(`Couldn't use the system keychain: ${String(error)}`);
    }
    console.warn("System keychain unavailable; the vault is protected by the password only.");
  }
  try {
    const kdf = newKdf();
    const key = await deriveVaultKey(password, kdf, deviceKey);
    const file = await encryptConfigs(key, deviceKey ? 4 : 3, kdf, configs, rev);
    return { key, file };
  } finally {
    deviceKey?.fill(0);
  }
}

export function newKdf(): KdfParams {
  return { name: "scrypt", ...SCRYPT, salt: bytesToBase64(randomBytes(SALT_BYTES)) };
}

async function encryptConfigs(
  key: CryptoKey,
  v: VaultVersion,
  kdf: VaultFile["kdf"],
  configs: Configs,
  rev: number,
): Promise<VaultFile> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(configs));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD[v] },
    key,
    plaintext,
  );
  return {
    v,
    kdf,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
    rev,
  };
}

/** Returns null when the key is wrong (GCM authentication fails). */
async function decryptConfigs(
  key: CryptoKey,
  file: VaultFile,
): Promise<Configs | null> {
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(file.iv), additionalData: AAD[file.v] },
      key,
      base64ToBytes(file.ct),
    );
  } catch {
    return null;
  }
  return normalizeConfigs(JSON.parse(new TextDecoder().decode(plaintext)));
}

function normalizeConfigs(value: Partial<Configs> | null | undefined): Configs {
  return {
    buckets: value?.buckets ?? {},
    credentials: value?.credentials ?? {},
    groups: value?.groups ?? {},
    activeBucket: value?.activeBucket ?? null,
  };
}

function inRange(value: unknown, min: number, max: number): boolean {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function readVaultFile(): VaultFile | null {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as VaultFile;
  const kdf = parsed?.kdf;
  if (
    (parsed?.v !== 3 && parsed?.v !== 4) ||
    kdf?.name !== "scrypt" ||
    // Bounds keep a tampered vault from making scrypt hang or exhaust memory.
    !inRange(kdf.N, 2 ** 14, 2 ** 20) ||
    !inRange(kdf.r, 1, 16) ||
    !inRange(kdf.p, 1, 4) ||
    typeof kdf.salt !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.ct !== "string"
  ) {
    throw new Error("The saved vault is damaged or from an unknown version.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// v2 migration

interface LegacyVerifier {
  v: 2;
  N: number;
  r: number;
  p: number;
  saltB64: string;
  hashB64: string;
  dataKeySaltB64: string;
}

function readLegacyVerifier(): LegacyVerifier | null {
  const raw = localStorage.getItem(LEGACY_VERIFIER_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LegacyVerifier;
    return parsed?.v === 2 ? parsed : null;
  } catch {
    return null;
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

async function unlockLegacy(
  password: string,
  verifier: LegacyVerifier,
): Promise<Configs | null> {
  const derived = await scryptAsync(password, base64ToBytes(verifier.saltB64), {
    N: verifier.N,
    r: verifier.r,
    p: verifier.p,
    dkLen: 32,
  });
  if (!constantTimeEqual(derived, base64ToBytes(verifier.hashB64))) {
    return null;
  }

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const legacyKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(verifier.dataKeySaltB64),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decryptField = async (blob: string): Promise<string> => {
    // v2 blob: "STH1" magic (4 bytes) + 12-byte IV + ciphertext.
    const combined = base64ToBytes(blob.trim());
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.subarray(4, 16) },
      legacyKey,
      combined.subarray(16),
    );
    return new TextDecoder().decode(plaintext);
  };

  const raw = localStorage.getItem(LEGACY_CONFIGS_KEY);
  const parsed = normalizeConfigs(raw ? JSON.parse(raw) : null);
  const credentials: Record<string, Credential> = {};
  for (const [id, credential] of Object.entries(parsed.credentials)) {
    credentials[id] = {
      id: credential.id,
      name: credential.name,
      accessKey: await decryptField(credential.accessKey),
      secretKey: await decryptField(credential.secretKey),
    };
  }
  return { ...parsed, credentials };
}

// ---------------------------------------------------------------------------
// Public API

export type VaultState = "setup" | "locked";

/** Whether a vault exists yet (either format). */
export function getVaultState(): VaultState {
  return localStorage.getItem(VAULT_STORAGE_KEY) !== null || readLegacyVerifier()
    ? "locked"
    : "setup";
}

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (new Set(password).size < 5) {
    return "Use a less repetitive password.";
  }
  return null;
}

/** First run: create an empty vault protected by `password`. */
export async function createVault(password: string): Promise<Configs> {
  const problem = validateNewPassword(password);
  if (problem) {
    throw new Error(problem);
  }
  const configs = emptyConfigs();
  const { key, file } = await sealNew(password, configs, 1, false);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(file));
  adoptSession(key, file);
  return configs;
}

/** The key that opens `file` if `password` is right. */
async function keyFor(password: string, file: VaultFile): Promise<CryptoKey> {
  const deviceKey = file.v === 4 ? await requireDeviceKey() : null;
  try {
    return await deriveVaultKey(password, file.kdf, deviceKey);
  } finally {
    deviceKey?.fill(0);
  }
}

/** Returns the decrypted configs, or null if the password is wrong. */
export async function unlockVault(password: string): Promise<Configs | null> {
  const file = readVaultFile();
  if (file) {
    const key = await keyFor(password, file);
    const configs = await decryptConfigs(key, file);
    if (!configs) {
      return null;
    }
    if (file.v === 3) {
      // Bind a password-only vault to the keychain when it's available. If
      // it isn't, keep the vault as it is rather than fail the unlock.
      const upgraded = await sealNew(password, configs, (file.rev ?? 0) + 1, false);
      if (upgraded.file.v === 4) {
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(upgraded.file));
        adoptSession(upgraded.key, upgraded.file);
        return configs;
      }
    }
    adoptSession(key, file);
    return configs;
  }

  const legacy = readLegacyVerifier();
  if (!legacy) {
    throw new Error("No vault found.");
  }
  const configs = await unlockLegacy(password, legacy);
  if (!configs) {
    return null;
  }

  // Re-encrypt everything in the current format, then drop the v2 data.
  const { key, file: migrated } = await sealNew(password, configs, 1, false);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(migrated));
  localStorage.removeItem(LEGACY_VERIFIER_KEY);
  localStorage.removeItem(LEGACY_CONFIGS_KEY);
  adoptSession(key, migrated);
  return configs;
}

/** The stored vault, or null when it is missing or unreadable. */
function readVaultFileOrNull(): VaultFile | null {
  try {
    return readVaultFile();
  } catch {
    return null;
  }
}

/**
 * Save only if the stored vault is still the one this tab knows: same key
 * (salt) and same revision. Encryption happens first; the check and the
 * write then run with no await in between, so no other tab can interleave.
 */
export async function saveVault(configs: Configs): Promise<void> {
  if (!sessionKey || !sessionKdf) {
    throw new Error("The vault is locked.");
  }
  const next = await encryptConfigs(
    sessionKey,
    sessionVersion,
    sessionKdf,
    configs,
    sessionRev + 1,
  );

  const stored = readVaultFileOrNull();
  if (!stored || stored.kdf.salt !== sessionKdf.salt) {
    lockVault();
    throw new VaultConflictError("rekeyed");
  }
  if ((stored.rev ?? 0) !== sessionRev) {
    throw new VaultConflictError("changed");
  }
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
  sessionRev = next.rev!;
}

/**
 * Re-read the vault after another window wrote it. Returns the current
 * settings when this tab's key still opens it; otherwise locks this tab and
 * returns null (password changed, vault reset, or data unreadable).
 */
export async function syncVault(): Promise<Configs | null> {
  if (!sessionKey || !sessionKdf) {
    return null;
  }
  const stored = readVaultFileOrNull();
  if (!stored || stored.kdf.salt !== sessionKdf.salt) {
    lockVault();
    return null;
  }
  const configs = await decryptConfigs(sessionKey, stored);
  if (!configs) {
    lockVault();
    return null;
  }
  sessionRev = stored.rev ?? 0;
  return configs;
}

/**
 * Re-encrypt the vault under a new password. Uses the stored settings (which
 * may be newer than this tab's) and returns them, or null when the current
 * password is wrong.
 */
export async function changeVaultPassword(
  currentPassword: string,
  newPassword: string,
): Promise<Configs | null> {
  const file = readVaultFile();
  const configs = file
    ? await decryptConfigs(await keyFor(currentPassword, file), file)
    : null;
  if (!file || !configs) {
    return null;
  }
  if (!sessionKdf || file.kdf.salt !== sessionKdf.salt) {
    lockVault();
    throw new VaultConflictError("rekeyed");
  }
  const problem = validateNewPassword(newPassword);
  if (problem) {
    throw new Error(problem);
  }
  // A keychain-bound vault must stay bound; a v3 one is upgraded if it can be.
  const { key, file: next } = await sealNew(
    newPassword,
    configs,
    (file.rev ?? 0) + 1,
    file.v === 4,
  );
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
  adoptSession(key, next);
  return configs;
}

export function lockVault(): void {
  sessionKey = null;
  sessionKdf = null;
  sessionVersion = 3;
  sessionRev = 0;
}

export { VAULT_STORAGE_KEY };

/** Permanently delete the vault and everything in it. */
export function destroyVault(): void {
  lockVault();
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem(LEGACY_VERIFIER_KEY);
  localStorage.removeItem(LEGACY_CONFIGS_KEY);
  sessionStorage.clear();
}
