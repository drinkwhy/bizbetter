import { NextRequest } from 'next/server';
import { gateEnabled } from '@/lib/auth/session';

const LOCAL = ['127.0.0.1', 'localhost', '::1', '[::1]'];
const hostOnly = (h: string) => (h.startsWith('[') ? h.slice(0, h.indexOf(']') + 1) : h.split(':')[0]).toLowerCase();

/** Hosts this deployment answers to besides localhost: Railway's public domain plus BIZBETTER_PUBLIC_HOSTS. */
export function publicHosts() {
  return [process.env.RAILWAY_PUBLIC_DOMAIN, ...(process.env.BIZBETTER_PUBLIC_HOSTS || '').split(',')].map((h) => (h || '').trim().toLowerCase()).filter(Boolean);
}

/**
 * Local requests are always allowed. A hosted request is allowed only when the password gate is on
 * (middleware has already verified the session cookie) and the Host is one of the configured public hosts.
 */
export function hostAllowed(host: string) {
  const name = hostOnly(host);
  if (LOCAL.includes(name)) return true;
  return gateEnabled() && publicHosts().map(hostOnly).includes(name);
}

/** Same-origin check for writes: the Origin (when sent) must be this exact host over http or https. */
export const requestHost = (req: NextRequest) => (req.headers.get('host') || req.nextUrl.host || '').toLowerCase();

export function originAllowed(req: NextRequest) {
  const origin = req.headers.get('origin'); if (!origin) return true;
  const host = requestHost(req);
  if (!hostAllowed(host)) return false;
  return origin.toLowerCase() === 'http://' + host || origin.toLowerCase() === 'https://' + host;
}

export function assertLocal(req: NextRequest, write = false) {
  if (!hostAllowed(requestHost(req))) throw new Error('This workspace is local-only; hosted use requires authentication.');
  if (write && !originAllowed(req)) throw new Error('Invalid request origin.');
}
