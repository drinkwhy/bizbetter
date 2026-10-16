import { analyze } from '@/lib/evidence/engine';
import { INSUFFICIENT, type BusinessWorkspace, type Finding, type NormalizedBusinessRecord, type SourceRecord } from '@/lib/evidence/model';
import { buildEvidence, callAIProvider, fallback, validateAnswer, type Answer } from '@/lib/ai/gateway';
import { assessSufficiency, type Sufficiency } from './sufficiency';

export const SMART_ANALYSIS_QUERY =
  'Smart analysis for the business owner. In plain language, explain what the verified evidence shows about profitability, losses and costs. ' +
  'For each issue: state the finding, likely causes as hypotheses, step-by-step fixes and how to prevent it recurring. ' +
  'Be concise: at most 6 facts, 4 patterns, 4 hypotheses and 6 recommendations, each one or two sentences. ' +
  'Mention a money amount only when it appears in the evidence. Never compute new numbers (no sums, differences, averages, percentages or counts); quote numbers exactly as they appear in evidence values or periods, and otherwise describe items by name. If the evidence cannot support a reliable conclusion, say "Insufficient data to determine this reliably." and list exactly what data is needed.';

export type SmartStatus = 'NEED_MORE_DATA' | 'AI_ANALYSIS' | 'DETERMINISTIC_ONLY';
export interface SmartResult {
  status: SmartStatus; message: string; provider: string; model: string | null; error?: string;
  sufficiency: Sufficiency; findings: Finding[]; answer: Answer | null; evidenceCount: number; fingerprint: string | null;
}
type Provider = typeof callAIProvider;

/** Runs the guided analysis on an already-scoped workspace. Pure apart from the optional AI call. */
export async function runSmartAnalysis(input: {
  businessId: string; business?: Pick<BusinessWorkspace, 'name' | 'industry'> | null;
  normalized: NormalizedBusinessRecord[]; records: SourceRecord[]; provider?: Provider; timeoutMs?: number;
}): Promise<SmartResult> {
  const result = analyze(input.records, input.businessId);
  const findings = result.findings;
  const sufficiency = assessSufficiency({ business: input.business, normalized: input.normalized, records: input.records, findings });
  const needText = sufficiency.needs.map((n) => n.message);
  if (sufficiency.verdict === 'NEED_MORE_DATA') {
    return { status: 'NEED_MORE_DATA', message: `${INSUFFICIENT} Provide the items below, then run the analysis again.`, provider: 'DETERMINISTIC', model: null,
      sufficiency, findings, answer: null, evidenceCount: 0, fingerprint: null };
  }
  const pack = buildEvidence(input.records, findings, SMART_ANALYSIS_QUERY);
  const merge = (a: Answer): Answer => ({ ...a, additionalDataNeeded: Array.from(new Set([...a.additionalDataNeeded, ...needText])) });
  const message = findings.length ? 'Analysis complete.' : `${INSUFFICIENT} No validated engine produced a finding from the data provided so far.`;
  try {
    const ai = await (input.provider || callAIProvider)(pack.context, 'DEEP', { timeoutMs: input.timeoutMs ?? (Number(process.env.BIZBETTER_SMART_ANALYSIS_TIMEOUT_MS) || 180_000), maxOutputTokens: 6000 });
    if (!ai) return { status: 'DETERMINISTIC_ONLY', message, provider: 'DETERMINISTIC', model: null, sufficiency, findings, answer: merge(fallback(findings, needText)), evidenceCount: pack.items.length, fingerprint: pack.fingerprint };
    const answer = validateAnswer(ai.value, pack.items);
    return { status: 'AI_ANALYSIS', message, provider: ai.provider, model: ai.model, sufficiency, findings, answer: merge(answer), evidenceCount: pack.items.length, fingerprint: pack.fingerprint };
  } catch (e) {
    return { status: 'DETERMINISTIC_ONLY', message, provider: 'DETERMINISTIC', model: null, error: `AI analysis failed safely: ${e instanceof Error ? e.message : 'provider unavailable'}. Deterministic findings below remain valid.`,
      sufficiency, findings, answer: merge(fallback(findings, needText)), evidenceCount: pack.items.length, fingerprint: pack.fingerprint };
  }
}
