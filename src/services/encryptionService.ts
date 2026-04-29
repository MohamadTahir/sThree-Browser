/**
 * Encryption service for securing bucket credentials
 * Uses Web Crypto API for AES-GCM encryption
 */

import { Configs } from "@/models/types";

const MASTER_PASSWORD_KEY = "s3browser_master_password_hash";
const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;

/**
 * Derive a key from a password using PBKDF2
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Create a new Uint8Array to avoid type issues
  const saltArray = new Uint8Array(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltArray,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: Configs,
  password: string
): Promise<string> {
  // Serialize data if not a string
  let serialized: string;
  serialized = JSON.stringify(data);

  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPassword(password, salt);

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(serialized);

  // Create new Uint8Array to avoid type issues
  const ivArray = new Uint8Array(iv);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: ivArray,
    },
    key,
    dataBuffer
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encryptedData.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  encryptedData: string,
  password: string
): Promise<Configs> {
  // Decode from base64
  const base64Data = atob(encryptedData);
  const combined = new Uint8Array(base64Data.length);
  for (let i = 0; i < base64Data.length; i++) {
    combined[i] = base64Data.charCodeAt(i);
  }

  // Extract salt, IV, and encrypted data
  const salt = new Uint8Array(combined.slice(0, SALT_LENGTH));
  const iv = new Uint8Array(combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH));
  const encrypted = new Uint8Array(combined.slice(SALT_LENGTH + IV_LENGTH));

  const key = await deriveKeyFromPassword(password, salt);

  // Create new Uint8Array to avoid type issues
  const ivArray = new Uint8Array(iv);

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: ivArray,
    },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  const decodedString = decoder.decode(decryptedData);

  // Parse JSON string into Configs object and return
  return JSON.parse(decodedString) as Configs;
}

/**
 * Hash a password for verification (using SHA-256)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if master password is set
 */
export function hasMasterPassword(): boolean {
  return localStorage.getItem(MASTER_PASSWORD_KEY) !== null;
}

/**
 * Set master password (stores hash for verification)
 */
export async function setMasterPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  // Store hash in localStorage so it persists across sessions
  localStorage.setItem(MASTER_PASSWORD_KEY, hash);

  // Also store in memory for the session (not persisted)
  (window as any).__s3browser_master_password = password;
}

/**
 * Verify master password
 */
export async function verifyMasterPassword(
  password: string
): Promise<boolean> {
  const storedHash = localStorage.getItem(MASTER_PASSWORD_KEY);
  if (!storedHash) {
    return false;
  }

  const inputHash = await hashPassword(password);
  return storedHash === inputHash;
}

/**
 * Get master password from memory (if available)
 */
export function getMasterPasswordFromMemory(): string | null {
  return (window as any).__s3browser_master_password || null;
}

/**
 * Clear master password from memory and storage
 */
export function clearMasterPassword(): void {
  localStorage.removeItem(MASTER_PASSWORD_KEY);
  delete (window as any).__s3browser_master_password;
}

/**
 * Clear all app data (master password, bucket configs, etc.)
 * This resets the app to its initial state
 */
export async function clearAllData(): Promise<void> {
  // Clear master password
  clearMasterPassword();

  localStorage.removeItem("bucket-configs");

  // Clear any sessionStorage items (in case there are any)
  sessionStorage.clear();

  // Clear memory state
  delete (window as any).__s3browser_master_password;
}

/**
 * Check if master password is unlocked (in memory)
 */
export function isMasterPasswordUnlocked(): boolean {
  return getMasterPasswordFromMemory() !== null;
}
