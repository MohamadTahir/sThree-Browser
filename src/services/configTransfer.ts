/**
 * Export and import of connection settings as an encrypted file.
 *
 * An export is a JSON file holding one AES-256-GCM ciphertext, keyed by
 * scrypt over a password the user picks at export time (not the master
 * password, so the file can be shared with another device or person). The
 * plaintext is the connections, groups and, optionally, credentials. The
 * file is untrusted on import: it is authenticated by decryption and its
 * contents are validated before anything reaches the vault.
 */

import { z } from "zod";
import { Bucket, Configs, Credential, Group } from "@/models/types";
import { parseEndpoint } from "@/lib/utils";
import {
  base64ToBytes,
  bytesToBase64,
  deriveKey,
  IV_BYTES,
  KdfParams,
  newKdf,
  randomBytes,
  validateNewPassword,
} from "@/services/vault";

export const EXPORT_EXTENSION = ".sthree";
const FORMAT = "sthree-export";
const AAD = new TextEncoder().encode("sthree-export-v1");

/** Largest file accepted on import; real exports are a few kilobytes. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const fileSchema = z.object({
  format: z.literal(FORMAT),
  v: z.literal(1),
  kdf: z.object({
    name: z.literal("scrypt"),
    // Bounds keep a crafted file from making scrypt hang or exhaust memory.
    N: z.number().int().min(2 ** 14).max(2 ** 20),
    r: z.number().int().min(1).max(16),
    p: z.number().int().min(1).max(4),
    salt: z.string().min(1),
  }),
  iv: z.string().min(1),
  ct: z.string().min(1),
});

const id = z.string().min(1).max(200);
const text = z.string().max(2000);
/** Same rule the dialogs enforce: something other than whitespace. */
const required = text.refine((v) => v.trim() !== "");

const payloadSchema = z.object({
  buckets: z.record(
    z.string(),
    z.object({
      id,
      nickname: required,
      bucketName: required,
      region: required,
      endpoint: text.refine((v) => v === "" || parseEndpoint(v) !== null).optional(),
      credentialId: z.string().max(200),
      askForCredentials: z.boolean().optional(),
      groupId: z.string().max(200).nullable().optional(),
      forcePathStyle: z.boolean(),
    }),
  ),
  credentials: z.record(
    z.string(),
    z.object({ id, name: required, accessKey: required, secretKey: required }),
  ),
  groups: z.record(
    z.string(),
    z.object({
      id,
      name: required,
      color: z.string().max(50).optional(),
      active: z.boolean().optional(),
    }),
  ),
});

export type ExportPayload = Pick<Configs, "buckets" | "credentials" | "groups">;

/** Encrypt the settings into the text of an export file. */
export async function createExport(
  configs: Configs,
  password: string,
  includeCredentials: boolean,
): Promise<string> {
  const problem = validateNewPassword(password);
  if (problem) {
    throw new Error(problem);
  }
  const payload: ExportPayload = {
    buckets: configs.buckets,
    credentials: includeCredentials ? configs.credentials : {},
    groups: configs.groups,
  };
  const kdf = newKdf();
  const key = await deriveKey(password, kdf);
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return JSON.stringify({
    format: FORMAT,
    v: 1,
    kdf,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

/** Parse an export file without decrypting it, so the format is checked early. */
export async function readExportFile(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error("This file is too large to be a sThree Browser export.");
  }
  const contents = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("This isn't a sThree Browser export file.");
  }
  if (!fileSchema.safeParse(parsed).success) {
    throw new Error("This isn't a sThree Browser export file, or it's from a newer version.");
  }
  return contents;
}

/**
 * Decrypt an export file. Returns null when the password is wrong or the
 * ciphertext was altered (AES-GCM can't tell the two apart).
 */
export async function openExport(
  contents: string,
  password: string,
): Promise<ExportPayload | null> {
  const file = fileSchema.parse(JSON.parse(contents));
  const key = await deriveKey(password, file.kdf as KdfParams);
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
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    data = null;
  }
  const result = payloadSchema.safeParse(data);
  if (!result.success) {
    throw new Error("The export file's contents are damaged.");
  }
  return rekey(result.data);
}

/** Use each item's own id as its key, so a mismatched record can't alias another. */
function rekey(payload: z.infer<typeof payloadSchema>): ExportPayload {
  const byId = <T extends { id: string }>(items: Record<string, T>) =>
    Object.fromEntries(Object.values(items).map((item) => [item.id, item]));
  return {
    buckets: byId<Bucket>(payload.buckets),
    credentials: byId<Credential>(payload.credentials),
    groups: byId<Group>(payload.groups),
  };
}

export interface ImportSummary {
  added: number;
  updated: number;
  /** Imported connections whose credential is neither in the file nor the vault. */
  missingCredentials: number;
}

export function summarizeImport(current: Configs, incoming: ExportPayload): ImportSummary {
  let added = 0;
  let updated = 0;
  for (const kind of ["buckets", "credentials", "groups"] as const) {
    for (const itemId in incoming[kind]) {
      if (Object.hasOwn(current[kind], itemId)) updated++;
      else added++;
    }
  }
  const missingCredentials = Object.values(incoming.buckets).filter(
    (b) =>
      !b.askForCredentials &&
      !Object.hasOwn(incoming.credentials, b.credentialId) &&
      !Object.hasOwn(current.credentials, b.credentialId),
  ).length;
  return { added, updated, missingCredentials };
}

/** Merge imported items into the vault; items with the same id are replaced. */
export function mergeImport(current: Configs, incoming: ExportPayload): Configs {
  return {
    ...current,
    buckets: { ...current.buckets, ...incoming.buckets },
    credentials: { ...current.credentials, ...incoming.credentials },
    groups: { ...current.groups, ...incoming.groups },
  };
}

export function exportFileName(date = new Date()): string {
  return `sthree-connections-${date.toISOString().slice(0, 10)}${EXPORT_EXTENSION}`;
}
