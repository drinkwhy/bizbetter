import { analyze } from '@/lib/evidence/engine';
import { INSUFFICIENT, type BusinessWorkspace, type Finding, type NormalizedBusinessRecord, type SourceRecord } from '@/lib/evidence/model';
import { buildEvidence, callAIProvider, fallback, validateAnswer, type Answer, type Item } from '@/lib/ai/gateway';
import { runLeakEngines, type LeakReport } from '@/lib/leaks/engine';
import { mergeFindings } from '@/lib/leaks/merge';
import { assessSufficiency, type Sufficiency } from './sufficiency';

export const SMART_ANALYSIS_QUERY =
  'Write a professional money-leak review for the business owner in plain language. The CALCULATION items are deterministic leak calculations; explain the most important ones first (largest amounts first). ' +
  'For each: what is happening, likely causes (as hypotheses), step-by-step fixes and how to prevent it. Then look across the SOURCE items for any other way money is being lost that the calculations missed and report it as a hypothesis with citations. ' +
  'Be concise: at most 8 facts, 4 patterns, 5 hypotheses and 8 recommendations, each one or two sentences. ' +
  'Mention a money amount only when it appears in the evidence. Never compute new numbers (no sums, differences, averages, percentages or counts); quote numbers exactly as they appear in evidence values, titles or periods, and otherwise describe items by name. ' +
  'If the evidence cannot support a reliable conclusion, say "Insufficient data to determine this reliably." and list exactly what data is needed.';

export type SmartStatus = 'NEED_MORE_DATA' | 'AI_ANALYSIS' | 'DETERMINISTIC_ONLY';
export interface SmartResult {
  status: SmartStatus; message: string; provider: string; model: string | null; error?: string; notes?: string[];
  sufficiency: Sufficiency; findings: Finding[]; report: LeakReport; answer: Answer | null; evidenceCount: number; fingerprint: string | null;
}
type Provider = typeof callAIProvider;

/** Removes model claims containing numbers the evidence does not support, instead of discarding the whole answer. */
export function salvageAnswer(raw: unknown, items: Item[]): { answer: Answer; removed: number } {
  try { return { answer: validateAnswer(raw, items), removed: 0 }; } catch (e) {
    if (!(e instanceof Error) || !/Unsupported quantitative/.test(e.message) || !raw || typeof raw !== 'object') throw e;
    const a = raw as Answer; const blank: Answer = { summary: '', facts: [], patterns: [], hypotheses: [], recommendations: [], additionalDataNeeded: [], confidence: 'LOW', limitations: [], questionsForOwner: [] };
    const ok = (text: string, alternatives: string[] = []) => { try { validateAnswer({ ...blank, summary: [text, ...alternatives].join(' ') }, items); return true; } catch { return false; } };
    let removed = 0; const keep = <T extends { text: string; alternatives?: string[] }>(xs: T[]) => (Array.isArray(xs) ? xs.filter((c) => { const y = ok(c.text, c.alternatives); if (!y) removed++; return y; }) : []);
    const strings = (xs: string[]) => (Array.isArray(xs) ? xs.filter((s) => { const y = ok(s); if (!y) removed++; return y; }) : []);
    const summaryOk = typeof a.summary === 'string' && ok(a.summary); if (!summaryOk) removed++;
    const fixed: Answer = { ...a, summary: summaryOk ? a.summary : 'Summary withheld: it contained a number that is not in the evidence. See the cited points below.', facts: keep(a.facts), patterns: keep(a.patterns), hypotheses: keep(a.hypotheses), recommendations: keep(a.recommendations), additionalDataNeeded: strings(a.additionalDataNeeded), limitations: strings(a.limitations), questionsForOwner: strings(a.questionsForOwner) };
    return { answer: validateAnswer(fixed, items), removed };
  }
}

/** Runs the guided money-leak analysis on an already-scoped workspace. Pure apart from the optional AI call. */
export async function runSmartAnalysis(input: {
  businessId: string; business?: Pick<BusinessWorkspace, 'name' | 'industry'> | null; normalized: NormalizedBusinessRecord[]; records: SourceRecord[];
  provider?: Provider; timeoutMs?: number; asOf?: string;
}): Promise<SmartResult> {
  const base = analyze(input.records, input.businessId);
  const report = runLeakEngines({ normalized: input.normalized, records: input.records, asOf: input.asOf });
  const findings = mergeFindings(base.findings, report);
  const sufficiency = assessSufficiency({ business: input.business, normalized: input.normalized, records: input.records, findings });
  const needText = sufficiency.needs.map((n) => n.message);
  if (sufficiency.verdict === 'NEED_MORE_DATA') {
    return { status: 'NEED_MORE_DATA', message: `${INSUFFICIENT} Provide the items below, then run the analysis again.`, provider: 'DETERMINISTIC', model: null,
      sufficiency, findings, report, answer: null, evidenceCount: 0, fingerprint: null };
  }
  const pack = buildEvidence(input.records, findings, SMART_ANALYSIS_QUERY);
  const merge = (a: Answer): Answer => ({ ...a, additionalDataNeeded: Array.from(new Set([...a.additionalDataNeeded, ...needText])) });
  const message = findings.length ? 'Analysis complete.' : `${INSUFFICIENT} No validated engine produced a finding from the data provided so far.`;
  const deterministic = (error?: string): SmartResult => ({ status: 'DETERMINISTIC_ONLY', message, provider: 'DETERMINISTIC', model: null, error, sufficiency, findings, report, answer: merge(fallback(findings, needText)), evidenceCount: pack.items.length, fingerprint: pack.fingerprint });
  try {
    const ai = await (input.provider || callAIProvider)(pack.context, 'DEEP', { timeoutMs: input.timeoutMs ?? (Number(process.env.BIZBETTER_SMART_ANALYSIS_TIMEOUT_MS) || 270_000), maxOutputTokens: 16000, grokModel: process.env.BIZBETTER_SMART_ANALYSIS_MODEL || process.env.BIZBETTER_AI_GROK_MODEL || 'grok-4.20-0309-reasoning' });
    if (!ai) return deterministic();
    const { answer, removed } = salvageAnswer(ai.value, pack.items);
    return { status: 'AI_ANALYSIS', message, provider: ai.provider, model: ai.model, sufficiency, findings, report, answer: merge(answer), evidenceCount: pack.items.length, fingerprint: pack.fingerprint,
      notes: removed ? [`${removed} AI statement(s) were removed because they contained numbers not found in the evidence.`] : [] };
  } catch (e) { return deterministic(`AI analysis failed safely: ${e instanceof Error ? e.message : 'provider unavailable'}. Deterministic findings below remain valid.`); }
}
