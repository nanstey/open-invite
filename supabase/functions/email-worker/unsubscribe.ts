// Signed one-click unsubscribe tokens. Pure (Web Crypto only — available in Deno,
// browsers, and Node 18+), so it is unit-testable and reusable by the unsubscribe
// endpoint. A token names WHAT to unsubscribe (a topic, or a whole scope) and is
// HMAC-signed so the no-auth endpoint can trust it without a session.

export type UnsubscribeScope = 'topic' | 'marketing' | 'all';

export interface UnsubscribeClaims {
  /** What the unsubscribe affects. */
  scope: UnsubscribeScope;
  /** Target user (present for user-addressed mail). */
  userId?: string;
  /** Target address (present for non-user / explicit-address mail). */
  email?: string;
  /** Topic to unsubscribe when scope === 'topic'. */
  topic?: string;
  /** Optional expiry (epoch seconds). */
  exp?: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Sign claims into a compact `payload.signature` token. */
export async function signUnsubscribeToken(
  claims: UnsubscribeClaims,
  secret: string
): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

/** Verify a token and return its claims, or null if invalid/expired/tampered. */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
  nowSeconds?: number
): Promise<UnsubscribeClaims | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) {
    return null;
  }
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const key = await hmacKey(secret);
  let ok: boolean;
  try {
    ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), encoder.encode(payload));
  } catch {
    return null;
  }
  if (!ok) {
    return null;
  }

  let claims: UnsubscribeClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    return null;
  }

  if (typeof claims.exp === 'number') {
    const now = nowSeconds ?? Math.floor(Date.now() / 1000);
    if (now > claims.exp) {
      return null;
    }
  }
  return claims;
}
