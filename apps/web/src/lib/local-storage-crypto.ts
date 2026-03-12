'use client';

const ENCRYPTION_PREFIX = 'ld-enc-v1:';
const DEFAULT_APP_SCOPE = 'life-design-web';

type EncryptedPayloadV1 = {
  v: 1;
  iv: string;
  data: string;
};

type DecryptResult = {
  plaintext: string | null;
  wasEncrypted: boolean;
  shouldMigrate: boolean;
};

function hasWebCrypto(): boolean {
  return typeof window !== 'undefined' && typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
}

function getAppScopedSecret(): string {
  const appScopedSecret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_SCOPE;
  return appScopedSecret.trim() || DEFAULT_APP_SCOPE;
}

function getDeviceInfoFingerprint(): string {
  if (typeof window === 'undefined') return 'server';

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  const platform = navigator.platform ?? '';
  const language = navigator.language ?? '';
  const userAgent = navigator.userAgent ?? '';
  const host = window.location.host ?? '';

  return [platform, language, timezone, userAgent, host].join('|');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveAesKey(scope: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = `${getAppScopedSecret()}::${getDeviceInfoFingerprint()}::${scope}`;
  const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(keyMaterial));
  return window.crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptLocalStorageString(plaintext: string, scope: string): Promise<string> {
  if (!hasWebCrypto()) return plaintext;

  try {
    const key = await deriveAesKey(scope);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const payload: EncryptedPayloadV1 = {
      v: 1,
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
    };

    return `${ENCRYPTION_PREFIX}${JSON.stringify(payload)}`;
  } catch (error) {
    console.warn('Falling back to plaintext localStorage write: encryption failed.', error);
    return plaintext;
  }
}

export async function decryptLocalStorageString(storedValue: string, scope: string): Promise<DecryptResult> {
  if (!storedValue.startsWith(ENCRYPTION_PREFIX)) {
    return {
      plaintext: storedValue,
      wasEncrypted: false,
      shouldMigrate: hasWebCrypto(),
    };
  }

  if (!hasWebCrypto()) {
    return {
      plaintext: null,
      wasEncrypted: true,
      shouldMigrate: false,
    };
  }

  try {
    const payload = JSON.parse(storedValue.slice(ENCRYPTION_PREFIX.length)) as EncryptedPayloadV1;
    if (payload.v !== 1 || !payload.iv || !payload.data) {
      throw new Error('Unsupported encrypted payload format.');
    }

    const key = await deriveAesKey(scope);
    const iv = base64ToBytes(payload.iv);
    const data = base64ToBytes(payload.data);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(data));

    return {
      plaintext: new TextDecoder().decode(decrypted),
      wasEncrypted: true,
      shouldMigrate: false,
    };
  } catch (error) {
    console.warn('Failed to decrypt localStorage value.', error);
    return {
      plaintext: null,
      wasEncrypted: true,
      shouldMigrate: false,
    };
  }
}
