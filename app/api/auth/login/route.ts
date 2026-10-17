import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createSessionToken, gateEnabled, safeNext, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { originAllowed } from '@/lib/evidence/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const attempts = new Map<string, number[]>();

function back(req: NextRequest, path: string) {
  // Build the redirect from the public host so it works behind Railway's proxy.
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  return NextResponse.redirect(`${proto}://${host}${path}`, 303);
}

export async function POST(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.json({ error: 'Access gate is not enabled.' }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const next = safeNext(String(form?.get('next') || '/'));
  const q = (e: string) => '/login?error=' + e + '&next=' + encodeURIComponent(next);
  if (!originAllowed(req)) return back(req, q('origin'));
  const who = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local', now = Date.now();
  const recent = (attempts.get(who) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 8) return back(req, q('limit'));
  if (!(await checkPassword(String(form?.get('password') || '')))) { attempts.set(who, [...recent, now]); return back(req, q('invalid')); }
  attempts.delete(who);
  const res = back(req, next);
  const secure = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')) === 'https';
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS });
  return res;
}
