import { analyze } from '@/lib/evidence/engine';
import type { Finding, NormalizedBusinessRecord, SourceRecord } from '@/lib/evidence/model';
import { runLeakEngines, type LeakReport } from './engine';

/** Older engine findings that a money-leak check replaces (same facts, now with one ranked, cited finding). */
const COVERED: Record<string, string> = { losing_months: 'Reported accounting loss', processor_fees: 'Processing fees', losing_jobs: 'Negative direct job contribution' };

export function mergeFindings(base: Finding[], report: LeakReport): Finding[] {
  const covered = report.checks.filter((c) => c.status !== 'NOT_ENOUGH_DATA' && COVERED[c.category]).map((c) => COVERED[c.category]);
  return [...report.leaks.map((l) => l.finding), ...base.filter((f) => !covered.some((t) => f.title.startsWith(t)))];
}

/** One findings list for every page, decision and ledger write: evidence-engine findings plus deterministic money-leak findings. */
export function analyzeWorkspace(records: SourceRecord[], normalized: NormalizedBusinessRecord[], businessId: string, asOf?: string) {
  const base = analyze(records, businessId);
  const report = runLeakEngines({ normalized, records, asOf });
  return { ...base, findings: mergeFindings(base.findings, report), leakReport: report };
}
