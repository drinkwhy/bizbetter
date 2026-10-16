import type { BusinessWorkspace, Finding, NormalizedBusinessRecord, SourceRecord } from '@/lib/evidence/model';
import { GUIDED_STEPS, guidedStepHref, type GuidedStepId } from './steps';

export type StepStatus = 'PROVIDED' | 'PARTIAL' | 'MISSING';
export interface ChecklistItem { id: GuidedStepId; title: string; required: boolean; status: StepStatus; records: number; months: number; detail: string; href: string }
export interface DataNeed { stepId: GuidedStepId; message: string; href: string; blocking: boolean }
export interface Sufficiency {
  verdict: 'READY' | 'NEED_MORE_DATA';
  checklist: ChecklistItem[];
  progress: { provided: number; partial: number; total: number; percent: number };
  /** Blocking gaps first, then items that would strengthen the analysis. */
  needs: DataNeed[];
}
export interface SufficiencyInput {
  business?: Pick<BusinessWorkspace, 'name' | 'industry'> | null;
  normalized: NormalizedBusinessRecord[];
  records: SourceRecord[];
  findings?: Finding[];
}

const month = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}/.test(v) ? v.slice(0, 7) : null);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Pure, deterministic checklist + sufficiency decision. Never estimates or fills missing values. */
export function assessSufficiency(input: SufficiencyInput): Sufficiency {
  const accepted = input.normalized.filter((r) => r.quality === 'ACCEPTED');
  const complete = input.records.filter((r) => r.complete);
  const datasetOf = new Map(input.normalized.map((r) => [r.id, r.datasetType]));
  const checklist: ChecklistItem[] = GUIDED_STEPS.map((step) => {
    const href = guidedStepHref(step.id);
    if (step.id === 'profile') {
      const name = input.business?.name?.trim(), industry = input.business?.industry?.trim();
      const named = !!name && name !== 'My Business';
      const status: StepStatus = named && industry ? 'PROVIDED' : named || industry ? 'PARTIAL' : 'MISSING';
      const detail = status === 'PROVIDED' ? `${name} (${industry})` : status === 'PARTIAL' ? (industry ? 'Business name is still the default.' : 'Industry is missing.') : 'Business name and industry are missing.';
      return { id: step.id, title: step.title, required: step.required, status, records: 0, months: 0, detail, href };
    }
    const recs = complete.filter((r) => { if (!step.metrics.includes(r.metric)) return false; if (!step.strictDatasets || !r.normalizedRecordId) return true; const d = datasetOf.get(r.normalizedRecordId); return !d || d === 'generic' || step.datasets.includes(d); });
    const rows = accepted.filter((r) => step.datasets.includes(r.datasetType));
    const months = new Set([...recs.map((r) => month(r.periodStart)), ...rows.map((r) => month(r.normalizedValues.date))].filter(Boolean)).size;
    // Only complete, dated financial evidence counts as "provided"; retained rows without evidence are partial.
    let status: StepStatus = 'MISSING', detail = 'Nothing provided yet.';
    if (recs.length && months >= step.minMonths) { status = 'PROVIDED'; detail = `${plural(recs.length, 'record')} across ${plural(months, 'month')}.`; }
    else if (recs.length) { status = 'PARTIAL'; detail = `Only ${plural(months, 'month')} provided; at least ${step.minMonths} needed.`; }
    else if (rows.length) { status = 'PARTIAL'; detail = `${plural(rows.length, 'row')} stored, but no complete dated amounts were created from them. Check the column mapping and currency.`; }
    return { id: step.id, title: step.title, required: step.required, status, records: recs.length, months, detail, href };
  });

  const needs: DataNeed[] = [];
  for (const c of checklist) if (c.required && c.status !== 'PROVIDED') needs.push({ stepId: c.id, blocking: true, href: c.href, message: `Provide ${c.title}: ${c.detail}` });
  if (!complete.length && !needs.some((n) => n.stepId === 'pnl')) needs.push({ stepId: 'pnl', blocking: true, href: guidedStepHref('pnl'), message: 'Provide at least one complete, dated financial record (start with your P&L).' });
  const blocking = needs.length > 0;
  // Ready to run, but no engine produced a finding: say exactly which item unlocks one.
  if (!blocking && (input.findings?.length ?? 0) === 0) {
    for (const c of checklist) {
      const step = GUIDED_STEPS.find((s) => s.id === c.id)!;
      if (step.engineUse === 'FINDINGS' && c.status !== 'PROVIDED' && !c.required) needs.push({ stepId: c.id, blocking: false, href: c.href, message: `Provide ${c.title} to unlock: ${step.unlocks}` });
    }
  }
  for (const c of checklist) if (!c.required && c.status === 'PARTIAL' && !needs.some((n) => n.stepId === c.id)) needs.push({ stepId: c.id, blocking: false, href: c.href, message: `Complete ${c.title}: ${c.detail}` });

  const provided = checklist.filter((c) => c.status === 'PROVIDED').length, partial = checklist.filter((c) => c.status === 'PARTIAL').length;
  return { verdict: blocking ? 'NEED_MORE_DATA' : 'READY', checklist, needs,
    progress: { provided, partial, total: checklist.length, percent: Math.round((100 * provided) / checklist.length) } };
}
