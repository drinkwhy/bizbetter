/**
 * Optional single-password access gate. Enabled only when BIZBETTER_ACCESS_PASSWORD is set, so local
 * development is unchanged. Uses Web Crypto so the same code runs in middleware (edge) and route handlers.
 */
export const SESSION_COOKIE = 'bb_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function accessPassword() { return process.env.BIZBETTER_ACCESS_PASSWORD || ''; }
export function gateEnabled() { return accessPassword().length > 0; }

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function key() {
  // Key derives from the password (or an explicit secret), so rotating the password signs everyone out.
  const material = process.env.BIZBETTER_SESSION_SECRET || 'bizbetter-session-v1:' + accessPassword();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(material));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(payload: string) { return hex(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload))); }

/** Constant-time comparison of two strings (length leak only). */
export function safeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b); let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % (x.length || 1)] ?? 0) ^ (y[i % (y.length || 1)] ?? 0);
  return diff === 0 && x.length === y.length;
}

export async function createSessionToken(now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS; const payload = 'v1.' + exp;
  return payload + '.' + (await sign(payload));
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()) {
  if (!token || !gateEnabled()) return false;
  const parts = token.split('.'); if (parts.length !== 3 || parts[0] !== 'v1' || !/^\d{1,12}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false;
  if (Number(parts[1]) * 1000 < now) return false;
  return safeEqual(parts[2], await sign(parts[0] + '.' + parts[1]));
}

export async function checkPassword(candidate: string) {
  const expected = accessPassword(); if (!expected || typeof candidate !== 'string' || candidate.length > 512) return false;
  // Compare digests so the comparison length does not depend on the secret.
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(candidate)), crypto.subtle.digest('SHA-256', enc.encode(expected))]);
  return safeEqual(hex(a), hex(b));
}

/** Only allow same-site relative redirect targets after login. */
export function safeNext(raw: string | null | undefined) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.startsWith('/login') || raw.length > 500) return '/';
  return raw;
}

/** Runtime gate state for the header (pages are prerendered, so it cannot be baked in at build time). No secrets. */
export function authStatus() {
  const gate = gateEnabled();
  const hosted = Boolean(process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_ENVIRONMENT || process.env.BIZBETTER_PUBLIC_HOSTS);
  return { gate, online: gate || hosted };
}
