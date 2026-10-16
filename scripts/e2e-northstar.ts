/**
 * End-to-end check through the running app's real API (default http://127.0.0.1:3000) with live Grok.
 * Creates (or reuses) a separate workspace for the fictional mock business, uploads every file in
 * mock-business/northstar, imports them, runs the money-leak analysis and compares it with the planted leaks.
 *   npx tsx scripts/e2e-northstar.ts
 * The user's other workspaces are never read or modified.
 */
import { promises as fs } from 'fs';
import path from 'path';

const BASE = process.env.BIZBETTER_URL || 'http://127.0.0.1:3000';
const NAME = 'Northstar Plumbing & Heating (mock)';
const INDUSTRY = 'Plumbing & HVAC contractor';
const dir = path.join(process.cwd(), 'mock-business', 'northstar');
const api = async (p: string, init?: RequestInit) => { const r = await fetch(BASE + p, { ...init, headers: { Origin: BASE, ...(init?.headers || {}) } }); const d = await r.json(); if (!r.ok) throw Object.assign(new Error(d.error || r.statusText), { status: r.status }); return d; };
const usd = (m: number | null) => (m === null ? 'n/a' : '$' + (m / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }));

async function main() {
  const { businesses } = await api('/api/intake/businesses');
  let biz = businesses.find((b: { name: string }) => b.name === NAME);
  if (!biz) biz = (await api('/api/intake/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: NAME, industry: INDUSTRY }) })).business;
  console.log(`Workspace: ${biz.name} (${biz.id})`);
  const existing = (await api('/api/documents?businessId=' + biz.id)).documents as Array<{ fileName: string; status: string }>;
  const files = (await fs.readdir(dir)).sort().filter((f) => !existing.some((d) => d.fileName === f && d.status === 'COMMITTED'));
  if (files.length) {
    const form = new FormData(); form.set('businessId', biz.id);
    for (const f of files) form.append('files', new Blob([await fs.readFile(path.join(dir, f))]), f);
    const t = Date.now(); const up = await api('/api/documents', { method: 'POST', body: form }); console.log(`Uploaded ${files.length} files in ${Date.now() - t} ms`);
    for (const d of up.documents) {
      const confirm = d.method === 'GROK_VISION' || d.method === 'GROK_EXTRACTED';
      let outcome = '';
      if (['READY', 'CONTEXT_ONLY', 'NEEDS_REVIEW'].includes(d.status)) { try { const c = await api('/api/documents/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: biz.id, documentId: d.id, complete: true, confirmAiRead: confirm }) }); outcome = `imported ${c.records} records`; } catch (e) { outcome = 'not imported: ' + (e as Error).message; } }
      else outcome = 'stored only';
      console.log(`  ${d.fileName.padEnd(48)} ${d.format.padEnd(5)} -> ${d.kind.padEnd(15)} ${d.method.padEnd(16)} rows=${String(d.rows.length).padEnd(4)} ${d.status.padEnd(13)} ${outcome}${d.warnings.length ? ' | ' + d.warnings.join(' / ').slice(0, 160) : ''}`);
    }
  } else console.log('All mock files already imported; re-running analysis only.');
  const t = Date.now();
  const res = await api('/api/smart-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: biz.id, asOf: '2026-10-16' }) });
  console.log(`\nAnalysis: ${res.status} via ${res.provider} ${res.model || ''} in ${Date.now() - t} ms${res.error ? ' | ' + res.error : ''}${res.notes?.length ? ' | ' + res.notes.join(' ') : ''}`);
  console.log(`Total estimated recoverable: ${usd(res.report.totalRecoverableMinor)}; booked losses: ${usd(res.report.bookedLossMinor)}`);
  for (const [i, l] of res.report.leaks.entries()) console.log(`  #${i + 1} ${usd(l.finding.impactMinor).padStart(12)}  [${l.basis}] ${l.finding.title}`);
  for (const c of res.report.checks) console.log(`  check ${c.label}: ${c.status} - ${c.note}`);
  const exp = JSON.parse(await fs.readFile(path.join(dir, '..', 'northstar_expected_leaks.json'), 'utf8')).planted;
  const amt = (c: string) => res.report.leaks.filter((l: { category: string }) => l.category === c).reduce((s: number, l: { finding: { impactMinor: number | null } }) => s + (l.finding.impactMinor ?? 0), 0);
  const want: Array<[string, string, number]> = [['Losing months', 'losing_months', exp.losing_months.total_loss], ['Losing jobs', 'losing_jobs', exp.losing_jobs.total], ['Overdue invoices', 'overdue_invoices', exp.overdue_invoices.total],
    ['Duplicate charges', 'duplicate_charges', exp.duplicate_bank_charge.amount + exp.duplicate_card_charge.amount], ['Subscription price creep', 'price_creep', exp.subscription_creep.excess_over_first], ['Overlapping GPS subscriptions', 'overlapping_subscriptions', 534],
    ['Overtime premium', 'overtime', exp.overtime.overtime_premium_estimate], ['Processor fee excess', 'processor_fees', exp.processor_fees.excess_over_2_9pct], ['Fuel + software cost trend', 'cost_trend', 3110 + 1050]];
  let fail = 0; console.log('\nPlanted vs found:');
  for (const [label, cat, dollars] of want) { const got = amt(cat), okk = got === Math.round(dollars * 100); if (!okk) fail++; console.log(`  ${okk ? 'OK  ' : 'MISS'} ${label.padEnd(30)} planted ${usd(Math.round(dollars * 100)).padStart(11)}  found ${usd(got).padStart(11)}`); }
  const under = res.report.leaks.find((l: { category: string }) => l.category === 'underpriced_jobs'); const uj = exp.underpriced_jobs.jobs.filter((j: string) => under?.details.some((d: string) => d.startsWith(j)));
  console.log(`  ${uj.length === 3 ? 'OK  ' : 'MISS'} Underpriced jobs ${exp.underpriced_jobs.jobs.join(', ')} -> found ${uj.join(', ')} (${usd(under?.finding.impactMinor ?? null)} estimated)`); if (uj.length !== 3) fail++;
  if (res.status !== 'AI_ANALYSIS') { console.log('Grok commentary missing'); fail++; }
  else console.log(`\nGrok summary: ${res.answer.summary}\nGrok recommendations: ${res.answer.recommendations.length}, hypotheses: ${res.answer.hypotheses.length}\n` + res.answer.hypotheses.map((h: { text: string }) => '  - ' + h.text).join('\n'));
  console.log(`\nOpen: ${BASE}/smart-analysis?businessId=${biz.id}`);
  console.log(fail ? `\nE2E FAILED (${fail})` : '\nE2E PASSED'); if (fail) process.exit(1);
}
main().catch((e) => { console.error('E2E ERROR', e instanceof Error ? e.message : e); process.exit(1); });
