import { NextResponse } from 'next/server';
import { authStatus } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Whether the access gate is on (shows the Sign out button) and whether this is a hosted copy. */
export async function GET() {
  return NextResponse.json(authStatus(), { headers: { 'Cache-Control': 'no-store' } });
}
