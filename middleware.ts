import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'bizbetter_session';

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function validSession(token: string | undefined) {
  const secret = process.env.BIZBETTER_SESSION_SECRET;
  if (!secret || secret.length < 32 || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0]),
    );
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === '/login' ||
    path === '/api/health' ||
    path === '/api/auth/login' ||
    path === '/api/auth/logout'
  ) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }
  if (
    path.startsWith('/_next/') ||
    path === '/favicon.ico' ||
    path === '/bizbetter-icon.svg' ||
    path === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  const authenticated = await validSession(request.cookies.get(COOKIE)?.value);
  if (!authenticated) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    return NextResponse.redirect(login);
  }

  // Overwrite any client-supplied value. Route handlers may trust this marker
  // because middleware sets it only after validating the signed HttpOnly cookie.
  const headers = new Headers(request.headers);
  headers.delete('x-bizbetter-authenticated');
  headers.set('x-bizbetter-authenticated', '1');
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
