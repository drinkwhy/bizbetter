import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { originAllowed } from '@/lib/evidence/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const res = NextResponse.redirect(`${proto}://${host}/login`, 303);
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: proto === 'https', sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
