import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { BUSINESS_ID, workspace } from '@/lib/evidence/repository';
import { buildEvidence, callAIProvider, fallback, type Depth } from '@/lib/ai/gateway';
import { salvageAnswer } from '@/lib/smart-analysis/run';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const calls = new Map<string, number[]>();
const cache = new Map<string, { at: number; value: unknown }>();
const versions = { gateway: '1.0.0', prompt: '1.1.0', engine: 'financial-integrity-v1' };

export async function POST(req: NextRequest) {
  try {
    assertLocal(req, true);
    if (Number(req.headers.get('content-length') || 0) > 12_000) throw new Error('Request limit exceeded.');

    const body = await req.json();
    if (typeof body.query !== 'string' || !body.query.trim() || body.query.length > 1_000) {
      throw new Error('Ask a question of up to 1,000 characters.');
    }
    const businessId = body.businessId === undefined ? BUSINESS_ID : body.businessId;
    if (typeof businessId !== 'string' || !businessId.trim() || businessId.length > 120) {
      throw new Error('Choose a valid business workspace.');
    }

    const depth: Depth = ['FAST', 'DEEP', 'AUDIT'].includes(body.depth) ? body.depth : 'FAST';
    const who = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const recent = (calls.get(who) || []).filter((time) => now - time < 60_000);
    if (recent.length >= 12) throw new Error('Analyst request limit reached. Try again in a minute.');
    recent.push(now);
    calls.set(who, recent);

    const data = await workspace(businessId);
    const pack = buildEvidence(data.records, data.findings, body.query);
    if (pack.items.length === 0) {
      return NextResponse.json({
        status: 'INSUFFICIENT_EVIDENCE', provider: 'DETERMINISTIC', model: null, depth,
        businessId, fingerprint: pack.fingerprint, versions,
        answer: fallback(data.findings, data.missing), evidence: [],
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const key = `${businessId}:${pack.fingerprint}:${body.query}:${depth}:${process.env.BIZBETTER_AI_PROVIDER || 'openai'}:${process.env.BIZBETTER_AI_MODEL || ''}:${process.env.BIZBETTER_AI_GROK_MODEL || ''}`;
    const cached = cache.get(key);
    if (cached && now - cached.at < 10 * 60_000) {
      return NextResponse.json(cached.value, { headers: { 'Cache-Control': 'no-store', 'X-BizBetter-Cache': 'HIT' } });
    }

    let answer;
    let provider = 'DETERMINISTIC';
    let model: string | null = null;
    let removed = 0;
    try {
      // The default 20 s gateway timeout is too short for Grok; use a model sized to the depth and a realistic timeout.
      const result = await callAIProvider(pack.context, depth, { timeoutMs: Number(process.env.BIZBETTER_ANALYST_TIMEOUT_MS) || 150_000, maxOutputTokens: 6000,
        grokModel: process.env.BIZBETTER_ANALYST_MODEL || process.env.BIZBETTER_AI_GROK_MODEL || (depth === 'FAST' ? 'grok-4.20-0309-non-reasoning' : 'grok-4.20-0309-reasoning') });
      if (result) {
        // Statements with numbers not in the evidence are removed (and counted) instead of discarding the whole answer.
        const salvaged = salvageAnswer(result.value, pack.items); answer = salvaged.answer; removed = salvaged.removed;
        provider = result.provider;
        model = result.model;
      } else {
        answer = fallback(data.findings, data.missing);
      }
    } catch (error) {
      const response = {
        status: 'UNAVAILABLE', method: 'DETERMINISTIC EVIDENCE ONLY',
        error: 'Advanced AI analysis failed safely. Deterministic findings remain available.',
        details: error instanceof Error ? error.message : 'Provider unavailable.',
        provider: 'DETERMINISTIC', model: null, depth, businessId,
        fingerprint: pack.fingerprint, versions,
        answer: fallback(data.findings, data.missing), evidence: pack.items,
      };
      return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
    }

    const response = {
      status: provider !== 'DETERMINISTIC' ? 'AI_ANALYSIS' : 'AI_NOT_CONFIGURED',
      provider, model, depth, businessId, fingerprint: pack.fingerprint,
      notes: removed ? [`${removed} AI statement(s) were removed because they contained numbers not found in the evidence.`] : [],
      generatedAt: new Date().toISOString(), versions, answer, evidence: pack.items,
    };
    cache.set(key, { at: now, value: response });
    cache.forEach((entry, cacheKey) => { if (now - entry.at > 10 * 60_000) cache.delete(cacheKey); });
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store', 'X-BizBetter-Cache': 'MISS' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis unavailable.' }, { status: 400 });
  }
}
