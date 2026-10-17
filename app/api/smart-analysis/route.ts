import { randomUUID } from 'crypto';
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
// Background jobs: Grok analysis takes 1-4 minutes, longer than some proxies keep an idle request open,
// so the page starts a job and polls for it. Kept in memory (single instance); the finished report is also saved to disk.
type Job = { id: string; businessId: string; status: 'running' | 'done' | 'error'; startedAt: number; result?: unknown; error?: string };
const g = globalThis as unknown as { smartJobs?: Map<string, Job> };
const jobs = (g.smartJobs ??= new Map<string, Job>());
function pruneJobs() { const cutoff = Date.now() - 60 * 60_000; for (const [id, j] of Array.from(jobs.entries())) if (j.startedAt < cutoff) jobs.delete(id); }

async function analyze(businessId: string, data: Awaited<ReturnType<typeof intakeWorkspace>>, asOf?: string) {
  const result = await runSmartAnalysis({ businessId, business: data.business, normalized: data.normalized, records: data.sourceRecords, asOf });
  const response = { businessId, businessName: data.business.name, industry: data.business.industry || null, generatedAt: new Date().toISOString(), ...result, records: data.sourceRecords, decisions: data.decisions, ledger: data.ledger };
  await saveReport(businessId, { ...response, records: undefined });
  return response;
}

async function scoped(raw: unknown) {
  const businesses = await listBusinesses();
  const businessId = typeof raw === 'string' && raw.trim() ? raw : businesses[0]?.id || BUSINESS_ID;
  if (businessId.length > 120 || !businesses.some((b) => b.id === businessId)) throw new Error('Choose a valid business workspace.');
  return { businesses, data: await intakeWorkspace(businessId), businessId };
}

export async function GET(req: NextRequest) {
  try {
    assertLocal(req);
    const jobId = req.nextUrl.searchParams.get('jobId');
    if (jobId) {
      const job = jobs.get(jobId);
      if (!job) return NextResponse.json({ error: 'This analysis job is no longer available (the server may have restarted). Run the analysis again.' }, { status: 404 });
      return NextResponse.json({ jobId, status: job.status, startedAt: new Date(job.startedAt).toISOString(), result: job.status === 'done' ? job.result : undefined, error: job.error }, { headers: { 'Cache-Control': 'no-store' } });
    }
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
    if (body.background === true) {
      pruneJobs();
      const running = Array.from(jobs.values()).find((j) => j.businessId === businessId && j.status === 'running');
      if (running) return NextResponse.json({ jobId: running.id, status: 'running' }, { status: 202 });
      const job: Job = { id: randomUUID(), businessId, status: 'running', startedAt: Date.now() }; jobs.set(job.id, job);
      analyze(businessId, data, asOf).then((r) => { job.status = 'done'; job.result = r; }).catch((e) => { job.status = 'error'; job.error = e instanceof Error ? e.message : 'Analysis unavailable.'; });
      return NextResponse.json({ jobId: job.id, status: 'running' }, { status: 202 });
    }
    const response = await analyze(businessId, data, asOf);
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Analysis unavailable.' }, { status: 400 }); }
}
