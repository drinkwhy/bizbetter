import assert from 'node:assert/strict';
import { assessSufficiency } from '@/lib/smart-analysis/sufficiency';
import { runSmartAnalysis } from '@/lib/smart-analysis/run';
import { GUIDED_STEPS } from '@/lib/smart-analysis/steps';
import { normalizeSheet } from '@/lib/intake/normalize';
import { INSUFFICIENT } from '@/lib/evidence/model';
import { completeDataset, profile, rec, TEST_BUSINESS } from './smart-fixtures';

async function main() {
  // 1. Empty workspace: blocked, names profile and P&L with links to their steps.
  const empty = assessSufficiency({ business: { name: 'My Business' }, normalized: [], records: [] });
  assert.equal(empty.verdict, 'NEED_MORE_DATA');
  assert.deepEqual(empty.needs.filter((n) => n.blocking).map((n) => n.stepId), ['profile', 'pnl']);
  assert.ok(empty.needs.every((n) => n.href.startsWith('/smart-analysis?step=')));
  assert.equal(empty.progress.provided, 0); assert.equal(empty.checklist.length, GUIDED_STEPS.length);

  // 2. Profile + only two months of P&L: P&L is partial and still blocking.
  const two = completeDataset().filter((r) => ['revenue', 'net_profit', 'expenses'].includes(r.metric)).slice(3);
  const partial = assessSufficiency({ business: profile, normalized: [], records: two });
  assert.equal(partial.verdict, 'NEED_MORE_DATA');
  assert.equal(partial.checklist.find((c) => c.id === 'pnl')!.status, 'PARTIAL');
  assert.match(partial.needs[0].message, /at least 3 needed/);

  // 3. Incomplete records never count as provided.
  const inc = assessSufficiency({ business: profile, normalized: [], records: [rec('revenue', '2026-01-01', 100, undefined, false)] });
  assert.equal(inc.checklist.find((c) => c.id === 'pnl')!.status, 'MISSING');

  // 4. NEED_MORE_DATA never calls the AI provider and returns the standard insufficiency message.
  let called = 0;
  const blocked = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: two, provider: async () => { called++; return null; } });
  assert.equal(blocked.status, 'NEED_MORE_DATA'); assert.equal(called, 0); assert.ok(blocked.message.startsWith(INSUFFICIENT)); assert.equal(blocked.answer, null);

  // 5. Complete fictional dataset: ready, deterministic findings with fixes and prevention.
  const full = completeDataset();
  const ready = assessSufficiency({ business: profile, normalized: [], records: full });
  assert.equal(ready.verdict, 'READY');
  for (const id of ['profile', 'pnl', 'job_costing', 'processor_fees']) assert.equal(ready.checklist.find((c) => c.id === id)!.status, 'PROVIDED', id);
  const det = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: full, provider: async () => null });
  assert.equal(det.status, 'DETERMINISTIC_ONLY');
  const titles = det.findings.map((f) => f.title);
  assert.ok(titles.includes('Reported accounting loss')); assert.ok(titles.some((t) => t.includes('JOB-1042'))); assert.ok(titles.some((t) => t.startsWith('Processing fees')));
  assert.ok(det.findings.every((f) => f.recovery.length && f.prevention.length));
  assert.equal(det.findings.find((f) => f.title.includes('JOB-1042'))!.impactMinor, 155_000);
  assert.ok(det.answer!.recommendations.length > 0);

  // 6. A model answer with a fabricated number is rejected; deterministic output stays.
  const fabricated = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: full,
    provider: async (ctx) => { const id = (ctx as { items: Array<{ id: string }> }).items[0].id; return { provider: 'GROK', model: 'stub', usage: null, value: { summary: 'You could save $98,765 per year.', facts: [{ text: 'Loss', evidenceIds: [id] }], patterns: [], hypotheses: [], recommendations: [], additionalDataNeeded: [], confidence: 'HIGH', limitations: [], questionsForOwner: [] } }; } });
  assert.equal(fabricated.status, 'DETERMINISTIC_ONLY'); assert.match(fabricated.error || '', /Unsupported quantitative/);

  // 7. Uncited claims are rejected.
  const uncited = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: full,
    provider: async () => ({ provider: 'GROK', model: 'stub', usage: null, value: { summary: 'ok', facts: [{ text: 'Loss', evidenceIds: ['EVID-MADEUP'] }], patterns: [], hypotheses: [], recommendations: [], additionalDataNeeded: [], confidence: 'LOW', limitations: [], questionsForOwner: [] } }) });
  assert.match(uncited.error || '', /Evidence reference/);

  // 8. Ready but no engine finding: says insufficient and names an unlocking step.
  const noFind = completeDataset().filter((r) => ['revenue', 'expenses'].includes(r.metric));
  const nf = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: noFind, provider: async () => null });
  assert.equal(nf.findings.length, 0); assert.ok(nf.message.startsWith(INSUFFICIENT));
  assert.ok(nf.sufficiency.needs.some((n) => n.stepId === 'job_costing' && !n.blocking));

  // 9. Processing fee column normalizes to the engine's `fees` metric.
  const sheet = { name: 'Fees', headers: ['Date', 'Fee'], rows: [{ Date: '2026-09-30', Fee: '42.10' }], classification: 'payments' as const, dateRange: null, mappings: [] };
  const n = normalizeSheet({ businessId: TEST_BUSINESS, importId: 'imp', fileName: 'fees.csv', fileType: 'csv', sheet, currency: 'USD', complete: true, existing: [],
    mappings: [{ sourceColumn: 'Date', targetField: 'date', confidence: 1, reason: 't', confirmed: true }, { sourceColumn: 'Fee', targetField: 'processing_fee', confidence: 1, reason: 't', confirmed: true }] });
  assert.equal(n.records[0].metric, 'fees'); assert.equal(n.records[0].value, 4210);

  console.log('Smart analysis sufficiency verification passed (9 scenarios).');
}
main().catch((e) => { console.error(e); process.exit(1); });
