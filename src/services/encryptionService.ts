/**
 * Encryption service for securing bucket credentials
 * Uses Web Crypto API for AES-GCM encryption
 */

import { scryptAsync } from "@noble/hashes/scrypt.js";
import { Configs } from "@/models/types";

const MASTER_PASSWORD_VERIFIER_KEY = "s3browser_master_password_hash";
const BUCKET_CONFIGS_STORAGE_KEY = "bucket-configs";

const SCRYPT_PARAMS = {
  N: 2 ** 17,
  r: 8,
  p: 1,
  dkLen: 32,
} as const;

const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/** Wrapped session-key blob: magic + iv + ciphertext (AES-GCM tag included in ciphertext). */
const CONFIG_WRAP_MAGIC = new Uint8Array([0x53, 0x54, 0x48, 0x31]); // "STH1"

let sessionDataEncryptionKey: CryptoKey | null = null;

/** Max code units per `fromCharCode` spread — avoids stack / arg limits on huge buffers. */
const BASE64_ENCODE_CHUNK = 8192;

function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_ENCODE_CHUNK) {
    const end = Math.min(i + BASE64_ENCODE_CHUNK, bytes.length);
    const slice = bytes.subarray(i, end);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

function isWrappedConfigFormat(combined: Uint8Array): boolean {
  if (combined.length < CONFIG_WRAP_MAGIC.length + IV_LENGTH + 16) {
    return false;
  }
  for (let i = 0; i < CONFIG_WRAP_MAGIC.length; i++) {
    if (combined[i] !== CONFIG_WRAP_MAGIC[i]) {
      return false;
    }
  }
  return true;
}

type ScryptVerifierStored = {
  v: 2;
  N: number;
  r: number;
  p: number;
  saltB64: string;
  hashB64: string;
  /** PBKDF2 salt for the non-extractable AES data key (public, not secret). */
  dataKeySaltB64: string;
};

function parseScryptVerifier(raw: string): ScryptVerifierStored | null {
  try {
    const o = JSON.parse(raw) as ScryptVerifierStored;
    if (
      o?.v === 2 &&
      typeof o.N === "number" &&
      typeof o.r === "number" &&
      typeof o.p === "number" &&
      typeof o.saltB64 === "string" &&
      typeof o.hashB64 === "string" &&
      typeof o.dataKeySaltB64 === "string"
    ) {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function deriveScryptVerifierBytes(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const derived = await scryptAsync(password, salt, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    dkLen: SCRYPT_PARAMS.dkLen,
  });
  return derived instanceof Uint8Array ? derived : new Uint8Array(derived);
}

async function writeScryptVerifier(password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derived = await deriveScryptVerifierBytes(password, salt);
  const dataKeySalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const payload: ScryptVerifierStored = {
    v: 2,
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    saltB64: bytesToBase64(salt),
    hashB64: bytesToBase64(derived),
    dataKeySaltB64: bytesToBase64(dataKeySalt),
  };
  localStorage.setItem(MASTER_PASSWORD_VERIFIER_KEY, JSON.stringify(payload));
}

async function deriveSessionDataEncryptionKey(
  password: string,
  dataKeySalt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(dataKeySalt),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

function clearSessionDataEncryptionKey(): void {
  sessionDataEncryptionKey = null;
}

async function establishSessionDataEncryptionKey(
  password: string,
): Promise<void> {
  const raw = localStorage.getItem(MASTER_PASSWORD_VERIFIER_KEY);
  if (!raw) {
    throw new Error("Master password verifier missing");
  }
  const parsed = parseScryptVerifier(raw);
  if (!parsed) {
    throw new Error("Master password verifier invalid or missing data key salt");
  }
  const dataKeySalt = base64ToBytes(parsed.dataKeySaltB64);
  sessionDataEncryptionKey = await deriveSessionDataEncryptionKey(
    password,
    dataKeySalt,
  );
}

/**
 * Encrypt configs with the in-memory session key (non-extractable).
 */
export async function encryptConfigs(data: Configs): Promise<string> {
  if (!sessionDataEncryptionKey) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  const iv = generateIV();
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv: new Uint8Array(iv) },
    sessionDataEncryptionKey,
    plaintext,
  );

  const combined = new Uint8Array(
    CONFIG_WRAP_MAGIC.length + iv.length + ciphertext.byteLength,
  );
  combined.set(CONFIG_WRAP_MAGIC, 0);
  combined.set(iv, CONFIG_WRAP_MAGIC.length);
  combined.set(
    new Uint8Array(ciphertext),
    CONFIG_WRAP_MAGIC.length + iv.length,
  );

  return bytesToBase64(combined);
}

/**
 * Decrypt configs using the in-memory session key.
 */
export async function decryptConfigs(encryptedData: string): Promise<Configs> {
  if (!sessionDataEncryptionKey) {
    throw new Error("Master password not unlocked. Please unlock first.");
  }

  let combined: Uint8Array;
  try {
    combined = base64ToBytes(encryptedData.trim());
  } catch {
    throw new Error("Invalid or corrupted stored configs.");
  }

  if (!isWrappedConfigFormat(combined)) {
    throw new Error("Invalid or corrupted stored configs.");
  }

  const iv = combined.subarray(
    CONFIG_WRAP_MAGIC.length,
    CONFIG_WRAP_MAGIC.length + IV_LENGTH,
  );
  const ciphertext = combined.subarray(
    CONFIG_WRAP_MAGIC.length + IV_LENGTH,
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv: new Uint8Array(iv) },
      sessionDataEncryptionKey,
      new Uint8Array(ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as Configs;
  } catch {
    throw new Error("Invalid or corrupted stored configs.");
  }
}

export function hasMasterPassword(): boolean {
  return localStorage.getItem(MASTER_PASSWORD_VERIFIER_KEY) !== null;
}

/**
 * First-time setup: scrypt verifier (with data-key salt) + non-extractable session AES key.
 */
export async function setMasterPassword(password: string): Promise<void> {
  await writeScryptVerifier(password);
  await establishSessionDataEncryptionKey(password);
}

export async function verifyMasterPassword(
  password: string,
): Promise<boolean> {
  const raw = localStorage.getItem(MASTER_PASSWORD_VERIFIER_KEY);
  if (!raw) {
    return false;
  }

  const parsed = parseScryptVerifier(raw);
  if (!parsed) {
    return false;
  }

  const salt = base64ToBytes(parsed.saltB64);
  const expected = base64ToBytes(parsed.hashB64);
  if (expected.length !== SCRYPT_PARAMS.dkLen) {
    return false;
  }

  const derived = await scryptAsync(password, salt, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    dkLen: SCRYPT_PARAMS.dkLen,
  });
  const derivedBytes =
    derived instanceof Uint8Array ? derived : new Uint8Array(derived);

  return timingSafeEqual(expected, derivedBytes);
}

/**
 * Verify password and derive session AES key (never persisted).
 */
export async function unlockMasterSession(password: string): Promise<boolean> {
  if (!(await verifyMasterPassword(password))) {
    return false;
  }

  await establishSessionDataEncryptionKey(password);
  return true;
}

export function isMasterPasswordUnlocked(): boolean {
  return sessionDataEncryptionKey !== null;
}

export async function clearAllData(): Promise<void> {
  try {
    clearSessionDataEncryptionKey();
    localStorage.removeItem(MASTER_PASSWORD_VERIFIER_KEY);
    localStorage.removeItem(BUCKET_CONFIGS_STORAGE_KEY);
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}
