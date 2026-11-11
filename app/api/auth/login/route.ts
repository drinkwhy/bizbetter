import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE = 'bizbetter_session';
const failures = new Map<string, { count: number; resetAt: number }>();

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  return origin === `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const password = process.env.BIZBETTER_ADMIN_PASSWORD;
  const secret = process.env.BIZBETTER_SESSION_SECRET;
  if (!password || password.length < 16 || !secret || secret.length < 32) {
    return NextResponse.json({ error: 'Private access is not configured. Contact the administrator.' }, { status: 503 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const record = failures.get(address);
  if (record && record.resetAt > now && record.count >= 8) {
    return NextResponse.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  if (record && record.resetAt <= now) failures.delete(address);

  let submitted = '';
  try {
    const body = await request.json();
    submitted = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Enter your password.' }, { status: 400 });
  }

  const expected = Buffer.from(password);
  const actual = Buffer.from(submitted);
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!matches) {
    const current = failures.get(address);
    failures.set(address, { count: (current?.count || 0) + 1, resetAt: current?.resetAt && current.resetAt > now ? current.resetAt : now + 15 * 60 * 1000 });
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }
  failures.delete(address);

  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 8 * 60 * 60 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
