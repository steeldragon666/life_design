/**
 * oauth-manager.ts
 *
 * Shared OAuth token management with AES-256-GCM encryption.
 *
 * All provider tokens (access + refresh) are encrypted before storage and
 * decrypted on retrieval. The encryption key is sourced from the ENCRYPTION_KEY
 * environment variable, which must be a 32-byte (64-char) hex string.
 *
 * Packed buffer format for the encrypted_tokens column:
 *   [ authTag (16 bytes) | ciphertext (variable) ]
 *
 * Revocation calls the provider's canonical revocation endpoint before
 * deleting the row so that dangling grants are cleaned up on the provider side.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16; // 128-bit authentication tag

/** Provider revocation endpoint registry. */
const REVOCATION_URLS: Record<string, string | null> = {
  strava: 'https://www.strava.com/oauth/deauthorize',
  google_calendar: 'https://oauth2.googleapis.com/revoke',
  apple_health: null, // Apple Health has no OAuth revocation endpoint
};

// ─────────────────────────────────────────────────────────────────────────────
// Public interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Token bundle for a provider connection. */
export interface ProviderTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds at which the access token expires. */
  expiresAt: number;
}

/** Connection config identifying a user + provider pair. */
export interface ConnectionConfig {
  /** The integration provider key, e.g. 'strava' or 'google_calendar'. */
  provider: string;
  /** UUID of the authenticated user. */
  userId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives the AES-256 encryption key from the ENCRYPTION_KEY env var.
 *
 * @returns A 32-byte Buffer suitable for AES-256.
 * @throws If ENCRYPTION_KEY is absent or not a 64-character hex string.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error(
      'oauth-manager: ENCRYPTION_KEY environment variable is required (32-byte hex string).',
    );
  }
  if (hexKey.length !== 64) {
    throw new Error(
      `oauth-manager: ENCRYPTION_KEY must be a 64-character hex string (got ${hexKey.length} chars).`,
    );
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts a UTF-8 plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt.
 * @returns Object containing ciphertext, iv, and authTag as Buffers.
 */
function encrypt(plaintext: string): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext: encrypted, iv, authTag: cipher.getAuthTag() };
}

/**
 * Decrypts an AES-256-GCM ciphertext back to a UTF-8 string.
 *
 * @param ciphertext - The encrypted bytes.
 * @param iv         - The initialisation vector.
 * @param authTag    - The GCM authentication tag.
 * @returns Original plaintext string.
 * @throws If authentication fails (tampered data or key mismatch).
 */
function decrypt(ciphertext: Buffer, iv: Buffer, authTag: Buffer): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Serialises ProviderTokens to JSON and encrypts it.
 * Stores the result as [ authTag (16 bytes) | ciphertext ] in one buffer.
 *
 * @param tokens - The tokens to encrypt.
 * @returns Object with packed encrypted buffer and separate IV buffer.
 */
function encryptTokens(tokens: ProviderTokens): { encryptedBuffer: Buffer; ivBuffer: Buffer } {
  const { ciphertext, iv, authTag } = encrypt(JSON.stringify(tokens));
  return { encryptedBuffer: Buffer.concat([authTag, ciphertext]), ivBuffer: iv };
}

/**
 * Decrypts and deserialises ProviderTokens from the packed buffer.
 *
 * @param encryptedBuffer - Combined buffer: [ authTag (16 bytes) | ciphertext ].
 * @param ivBuffer        - The IV from the token_iv column.
 * @returns Decrypted ProviderTokens.
 */
function decryptTokens(encryptedBuffer: Buffer, ivBuffer: Buffer): ProviderTokens {
  const authTag = encryptedBuffer.subarray(0, AUTH_TAG_BYTES);
  const ciphertext = encryptedBuffer.subarray(AUTH_TAG_BYTES);
  return JSON.parse(decrypt(ciphertext, ivBuffer, authTag)) as ProviderTokens;
}

/**
 * Converts a Postgres hex-encoded bytea string (e.g. '\\x...') or a Buffer
 * to a Buffer. Supabase returns bytea columns as hex strings prefixed with
 * '\\x'.
 *
 * @param value - Hex string or Buffer.
 * @returns A Buffer containing the raw bytes.
 */
function hexOrBuffer(value: string | Buffer): Buffer {
  if (Buffer.isBuffer(value)) return value;
  const hex = (value as string).startsWith('\\x') ? (value as string).slice(2) : (value as string);
  return Buffer.from(hex, 'hex');
}

/**
 * Posts to a provider's OAuth token revocation endpoint.
 *
 * - Strava: POST with access_token form field.
 * - Google: POST to URL with token query parameter.
 *
 * @param provider    - Provider key (e.g. 'strava').
 * @param url         - Full revocation endpoint URL.
 * @param accessToken - Token to revoke.
 * @throws If the HTTP response is not 2xx.
 */
async function callRevocationEndpoint(
  provider: string,
  url: string,
  accessToken: string,
): Promise<void> {
  let response: Response;
  if (provider === 'google_calendar') {
    response = await fetch(`${url}?token=${encodeURIComponent(accessToken)}`, { method: 'POST' });
  } else {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken }).toString(),
    });
  }
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} from ${provider} revocation endpoint: ${response.statusText}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypts and upserts OAuth tokens into the user_connections table.
 *
 * The service role client must be supplied for INSERT/UPDATE because the RLS
 * policy only permits service_role writes to this table.
 *
 * @param supabase - Supabase client (service role for writes).
 * @param config   - The user + provider pair to store tokens for.
 * @param tokens   - The access/refresh tokens and expiry timestamp.
 * @throws If encryption fails or the Supabase upsert returns an error.
 */
export async function storeTokens(
  supabase: SupabaseClient,
  config: ConnectionConfig,
  tokens: ProviderTokens,
): Promise<void> {
  const { encryptedBuffer, ivBuffer } = encryptTokens(tokens);

  const { error } = await supabase
    .from('user_connections')
    .upsert(
      {
        user_id: config.userId,
        provider: config.provider,
        encrypted_tokens: encryptedBuffer,
        token_iv: ivBuffer,
        expires_at: new Date(tokens.expiresAt * 1000).toISOString(),
        sync_enabled: true,
      },
      { onConflict: 'user_id,provider' },
    );

  if (error) {
    throw new Error(`storeTokens: Supabase upsert failed — ${error.message}`);
  }
}

/**
 * Retrieves and decrypts OAuth tokens for a provider connection.
 *
 * @param supabase - An authenticated Supabase client.
 * @param config   - The user + provider pair to fetch tokens for.
 * @returns The decrypted ProviderTokens, or null if no connection row exists.
 * @throws If decryption fails (tampered data, wrong key, etc.).
 */
export async function getTokens(
  supabase: SupabaseClient,
  config: ConnectionConfig,
): Promise<ProviderTokens | null> {
  const { data, error } = await supabase
    .from('user_connections')
    .select('encrypted_tokens, token_iv, expires_at')
    .eq('user_id', config.userId)
    .eq('provider', config.provider)
    .single();

  if (error || !data) return null;

  const encryptedBuffer = hexOrBuffer(data.encrypted_tokens as string | Buffer);
  const ivBuffer = hexOrBuffer(data.token_iv as string | Buffer);
  return decryptTokens(encryptedBuffer, ivBuffer);
}

/**
 * Revokes the provider's OAuth grant, deletes the connection row, and logs
 * the disconnection event to connector_sync_log.
 *
 * If the provider has no revocation endpoint (e.g. apple_health), the remote
 * call is skipped — the row is still deleted.
 *
 * Provider revocation HTTP failures are logged but do not block row deletion.
 *
 * @param supabase - An authenticated Supabase client.
 * @param config   - The user + provider pair to revoke.
 * @throws If the Supabase delete returns an error.
 */
export async function revokeTokens(
  supabase: SupabaseClient,
  config: ConnectionConfig,
): Promise<void> {
  const tokens = await getTokens(supabase, config);

  if (tokens) {
    const revocationUrl = REVOCATION_URLS[config.provider];
    if (revocationUrl) {
      try {
        await callRevocationEndpoint(config.provider, revocationUrl, tokens.accessToken);
      } catch (err) {
        console.warn(
          `revokeTokens: provider revocation failed for ${config.provider} (user ${config.userId}): ${(err as Error).message}`,
        );
      }
    }
  }

  const { error } = await supabase
    .from('user_connections')
    .delete()
    .eq('user_id', config.userId)
    .eq('provider', config.provider);

  if (error) {
    throw new Error(`revokeTokens: Supabase delete failed — ${error.message}`);
  }

  // Non-fatal: write a disconnection audit log entry.
  await supabase
    .from('connector_sync_log')
    .insert({
      user_id: config.userId,
      provider: config.provider,
      event: 'disconnected',
      recorded_at: new Date().toISOString(),
    })
    .then(({ error: logError }: { error: { message: string } | null }) => {
      if (logError) {
        console.warn(`revokeTokens: failed to write disconnection log — ${logError.message}`);
      }
    });
}
