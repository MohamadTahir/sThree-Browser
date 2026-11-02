/**
 * Encrypted local vault for connection settings and credentials.
 *
 * Format v3: the whole config (credentials, bucket names, endpoints, folders)
 * is one AES-256-GCM ciphertext. The key comes from scrypt over the master
 * password and is held only in memory as a non-extractable CryptoKey.
 * Unlocking means successfully decrypting the vault; there is no separate
 * password hash that could be attacked more cheaply than the data itself.
 *
 * Older v2 data (scrypt verifier + PBKDF2 key, only keys encrypted) is
 * migrated to v3 on the first successful unlock.
 */

import { scryptAsync } from "@noble/hashes/scrypt.js";
import { Configs, Credential, emptyConfigs } from "@/models/types";

const VAULT_STORAGE_KEY = "sthree-vault";

/** v2 storage keys, read only for migration. */
const LEGACY_VERIFIER_KEY = "s3browser_master_password_hash";
const LEGACY_CONFIGS_KEY = "bucket-configs";

const SCRYPT = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;
/** Binds the ciphertext to this format so it can't be swapped for another blob. */
const AAD = new TextEncoder().encode("sthree-vault-v3");

export const MIN_PASSWORD_LENGTH = 12;

interface VaultFile {
  v: 3;
  kdf: { name: "scrypt"; N: number; r: number; p: number; salt: string };
  iv: string;
  ct: string;
  /** Incremented on every write; lets a tab detect writes by other tabs. */
  rev?: number;
}

let sessionKey: CryptoKey | null = null;
let sessionKdf: VaultFile["kdf"] | null = null;
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

function adoptSession(key: CryptoKey, kdf: VaultFile["kdf"], rev: number): void {
  sessionKey = key;
  sessionKdf = kdf;
  sessionRev = rev;
}

// ---------------------------------------------------------------------------
// Encoding helpers

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

// ---------------------------------------------------------------------------
// Key derivation and AES-GCM

async function deriveKey(
  password: string,
  kdf: VaultFile["kdf"],
): Promise<CryptoKey> {
  const raw = await scryptAsync(password.normalize("NFKC"), base64ToBytes(kdf.salt), {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    dkLen: KEY_BYTES,
  });
  try {
    return await crypto.subtle.importKey(
      "raw",
      new Uint8Array(raw),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
  } finally {
    raw.fill(0);
  }
}

function newKdf(): VaultFile["kdf"] {
  return { name: "scrypt", ...SCRYPT, salt: bytesToBase64(randomBytes(SALT_BYTES)) };
}

async function encryptConfigs(
  key: CryptoKey,
  kdf: VaultFile["kdf"],
  configs: Configs,
  rev: number,
): Promise<VaultFile> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(configs));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD },
    key,
    plaintext,
  );
  return {
    v: 3,
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
      { name: "AES-GCM", iv: base64ToBytes(file.iv), additionalData: AAD },
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

function readVaultFile(): VaultFile | null {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as VaultFile;
  if (
    parsed?.v !== 3 ||
    parsed.kdf?.name !== "scrypt" ||
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
  const kdf = newKdf();
  const key = await deriveKey(password, kdf);
  const configs = emptyConfigs();
  const file = await encryptConfigs(key, kdf, configs, 1);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(file));
  adoptSession(key, kdf, 1);
  return configs;
}

/** Returns the decrypted configs, or null if the password is wrong. */
export async function unlockVault(password: string): Promise<Configs | null> {
  const file = readVaultFile();
  if (file) {
    const key = await deriveKey(password, file.kdf);
    const configs = await decryptConfigs(key, file);
    if (!configs) {
      return null;
    }
    adoptSession(key, file.kdf, file.rev ?? 0);
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

  // Re-encrypt everything in the v3 format, then drop the v2 data.
  const kdf = newKdf();
  const key = await deriveKey(password, kdf);
  const migrated = await encryptConfigs(key, kdf, configs, 1);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(migrated));
  localStorage.removeItem(LEGACY_VERIFIER_KEY);
  localStorage.removeItem(LEGACY_CONFIGS_KEY);
  adoptSession(key, kdf, 1);
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
  const next = await encryptConfigs(sessionKey, sessionKdf, configs, sessionRev + 1);

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
    ? await decryptConfigs(await deriveKey(currentPassword, file.kdf), file)
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
  const kdf = newKdf();
  const key = await deriveKey(newPassword, kdf);
  const rev = (file.rev ?? 0) + 1;
  const next = await encryptConfigs(key, kdf, configs, rev);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
  adoptSession(key, kdf, rev);
  return configs;
}

export function lockVault(): void {
  sessionKey = null;
  sessionKdf = null;
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
