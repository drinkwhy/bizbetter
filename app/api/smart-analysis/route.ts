import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { BUSINESS_ID, intakeWorkspace, listBusinesses } from '@/lib/evidence/repository';
import { runSmartAnalysis } from '@/lib/smart-analysis/run';
import { assessSufficiency } from '@/lib/smart-analysis/sufficiency';
import { GUIDED_STEPS } from '@/lib/smart-analysis/steps';
import { loadReport, saveReport } from '@/lib/smart-analysis/reports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
const calls = new Map<string, number[]>();

async function scoped(raw: unknown) {
  const businesses = await listBusinesses();
  const businessId = typeof raw === 'string' && raw.trim() ? raw : businesses[0]?.id || BUSINESS_ID;
  if (businessId.length > 120 || !businesses.some((b) => b.id === businessId)) throw new Error('Choose a valid business workspace.');
  return { businesses, data: await intakeWorkspace(businessId), businessId };
}

export async function GET(req: NextRequest) {
  try {
    assertLocal(req);
    const { businesses, data, businessId } = await scoped(req.nextUrl.searchParams.get('businessId'));
    const sufficiency = assessSufficiency({ business: data.business, normalized: data.normalized, records: data.sourceRecords, findings: data.analysis.findings });
    const last = await loadReport<Record<string, unknown>>(businessId);
    return NextResponse.json({ businesses, businessId, business: data.business, steps: GUIDED_STEPS, sufficiency, last }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load guided intake.' }, { status: 400 }); }
}

export async function POST(req: NextRequest) {
  try {
    assertLocal(req, true);
    if (Number(req.headers.get('content-length') || 0) > 4_000) throw new Error('Request limit exceeded.');
    const who = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local', now = Date.now();
    const recent = (calls.get(who) || []).filter((t) => now - t < 60_000);
    if (recent.length >= 6) throw new Error('Analysis limit reached. Try again in a minute.');
    calls.set(who, [...recent, now]);
    const body = await req.json().catch(() => ({}));
    const { data, businessId } = await scoped(body.businessId);
    const asOf = typeof body.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.asOf) ? body.asOf : undefined;
    const result = await runSmartAnalysis({ businessId, business: data.business, normalized: data.normalized, records: data.sourceRecords, asOf });
    const response = { businessId, businessName: data.business.name, industry: data.business.industry || null, generatedAt: new Date().toISOString(), ...result, records: data.sourceRecords, decisions: data.decisions, ledger: data.ledger };
    await saveReport(businessId, { ...response, records: undefined });
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Analysis unavailable.' }, { status: 400 }); }
}
