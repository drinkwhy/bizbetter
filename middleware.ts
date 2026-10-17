import { NextRequest, NextResponse } from 'next/server';
import { gateEnabled, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

/** Password gate for hosted use. Off (pass-through) when BIZBETTER_ACCESS_PASSWORD is unset. */
export async function middleware(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) return NextResponse.next();
  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  // Build the redirect from the public Host (behind Railway's proxy nextUrl can carry the bind address).
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  return NextResponse.redirect(`${proto}://${host}/login?next=${encodeURIComponent(pathname + search)}`, 307);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'] };
