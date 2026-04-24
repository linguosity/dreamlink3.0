// lib/crypto.ts
//
// AES-256-GCM encryption for privacy-sensitive dream content.
// Key is loaded from DREAM_ENCRYPTION_KEY (base64-encoded 32 bytes).
//
// Wire format (base64-encoded TEXT column in Postgres):
//   [version:1 byte][iv:12 bytes][authTag:16 bytes][ciphertext:variable]
//
// Version byte enables future key rotation / algorithm changes without a
// schema migration: the decrypt path switches on this byte.

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "crypto";

const ALGO: CipherGCMTypes = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION_V1 = 0x01;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.DREAM_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "DREAM_ENCRYPTION_KEY is not set. Generate with `openssl rand -base64 32` and add to env.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `DREAM_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}. Regenerate with \`openssl rand -base64 32\`.`,
    );
  }

  cachedKey = key;
  return key;
}

/**
 * Encrypt a UTF-8 string. Returns base64 suitable for a TEXT column.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const packed = Buffer.concat([Buffer.from([VERSION_V1]), iv, tag, ciphertext]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64 blob produced by `encrypt`. Throws on tamper / bad key.
 * Returns null if the input is null/empty so callers can fall back to
 * the legacy plaintext column for old rows.
 */
export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;

  const packed = Buffer.from(blob, "base64");
  if (packed.length < 1 + IV_LEN + TAG_LEN) {
    throw new Error("ciphertext too short");
  }

  const version = packed[0];
  if (version !== VERSION_V1) {
    throw new Error(`unsupported ciphertext version: ${version}`);
  }

  const iv = packed.subarray(1, 1 + IV_LEN);
  const tag = packed.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const ciphertext = packed.subarray(1 + IV_LEN + TAG_LEN);

  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * JSON helper — stringify then encrypt, or decrypt then parse.
 */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T = unknown>(blob: string | null | undefined): T | null {
  const plain = decrypt(blob);
  return plain === null ? null : (JSON.parse(plain) as T);
}

/**
 * Decrypt the privacy-sensitive fields on a dream row in place.
 *
 * - Populates `original_text` / `raw_analysis` from their `_enc` counterparts.
 * - Strips the `_enc` columns from the response so they never reach the client.
 * - Falls back to the legacy plaintext columns for rows saved before
 *   encryption was introduced.
 *
 * Safe to call on an already-plaintext row (no-op).
 */
export function decryptDreamRow<
  T extends {
    original_text?: string | null;
    original_text_enc?: string | null;
    raw_analysis?: unknown;
    raw_analysis_enc?: string | null;
  },
>(row: T): T {
  if (!row) return row;

  if (row.original_text_enc) {
    try {
      row.original_text = decrypt(row.original_text_enc);
    } catch (err) {
      console.error("[crypto] failed to decrypt original_text", err);
      row.original_text = null;
    }
  }

  if (row.raw_analysis_enc) {
    try {
      row.raw_analysis = decryptJson(row.raw_analysis_enc);
    } catch (err) {
      console.error("[crypto] failed to decrypt raw_analysis", err);
      row.raw_analysis = null;
    }
  }

  delete row.original_text_enc;
  delete row.raw_analysis_enc;
  return row;
}
