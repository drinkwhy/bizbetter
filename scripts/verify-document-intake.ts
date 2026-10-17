/**
 * Offline tests for document detection, extraction, normalization and the money-leak engines.
 * Uses the fictional Northstar files in mock-business/northstar. No AI calls, no repository writes.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import { extractDocument } from '@/lib/documents/extract';
import { documentToEvidence } from '@/lib/documents/records';
import { parseAnyDate, parseMoneyMinor, appearsInText } from '@/lib/documents/parse';
import { sniffFormat } from '@/lib/documents/read';
import { runLeakEngines } from '@/lib/leaks/engine';
import { capabilityReport } from '@/lib/intake/capabilities';
import { runSmartAnalysis } from '@/lib/smart-analysis/run';
import type { ExtractedDocument } from '@/lib/documents/types';

const dir = path.join(process.cwd(), 'mock-business', 'northstar');
const BIZ = 'doc-test-workspace';
let n = 0; const ok = (label: string) => console.log(`PASS ${++n} ${label}`);
const read = (f: string) => fs.readFile(path.join(dir, f));
const extract = async (fileName: string, buf: Buffer, aiCall: import('@/lib/documents/extract').ExtractOptions['aiCall'] = null) => extractDocument({ id: 'test-' + n + '-' + fileName.length, businessId: BIZ, fileName, storedAs: fileName, buf }, { aiCall });

async function main() {
  // Parsers
  assert.equal(parseMoneyMinor('$1,234.56'), 123456); assert.equal(parseMoneyMinor('(2,418.37)'), -241837); assert.equal(parseMoneyMinor('-89.00'), -8900); assert.equal(parseMoneyMinor('=SUM(A1:A3)'), null); assert.equal(parseMoneyMinor('12.345'), null); assert.equal(parseMoneyMinor(3842.1), 384210);
  assert.equal(parseAnyDate('09/08', 2026), '2026-09-08'); assert.equal(parseAnyDate('09/08'), null); assert.equal(parseAnyDate('Oct 2025'), '2025-10-01'); assert.equal(parseAnyDate('2026-02-30'), null);
  assert.ok(appearsInText('2418.37', '09/08 FERGUSON SUPPLY -2,418.37 41,229.11')); assert.ok(!appearsInText('2418.73', '09/08 FERGUSON SUPPLY -2,418.37'));
  ok('money/date parsing rejects formulas, extra precision, impossible dates and missing years');

  const files = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name).sort(); /* sub-folders such as statements/ are not part of this set */ const docs: Record<string, ExtractedDocument> = {};
  for (const f of files) docs[f] = await extract(f, await read(f));
  const expect: Record<string, [string, string, number]> = {
    'northstar_profit_and_loss_oct2025-sep2026.xlsx': ['xlsx', 'pnl', 0], 'northstar_bank_statement_sep2026.pdf': ['pdf', 'bank_statement', 20], 'northstar_credit_card_apr-sep2026.csv': ['csv', 'card_statement', 51],
    'northstar_invoices_ar_jul-sep2026.csv': ['csv', 'invoices', 24], 'northstar_job_costing_jul-sep2026.csv': ['csv', 'job_costing', 30], 'northstar_payroll_register_jul-sep2026.xlsx': ['xlsx', 'payroll', 42],
    'stripe_payouts_export_2026.csv': ['csv', 'processor_fees', 12], 'northstar_timesheets_jul-sep2026.csv': ['csv', 'timesheet', 35], 'northstar_marketing_spend_jul-sep2026.csv': ['csv', 'marketing', 9], 'northstar_business_notes.docx': ['docx', 'business_notes', 0], 'receipt_menards_2026-09-15.png': ['image', 'receipt', 0] };
  for (const [f, [format, kind, rows]] of Object.entries(expect)) { const d = docs[f]; assert.ok(d, 'missing mock file ' + f); assert.equal(d.format, format, f); assert.equal(d.kind, kind, f); if (rows) assert.equal(d.rows.length, rows, f + ' rows'); }
  assert.equal(docs['northstar_profit_and_loss_oct2025-sep2026.xlsx'].rows.filter((r) => r.values.section === 'net_income').length, 12);
  assert.equal(docs['northstar_business_notes.docx'].status, 'CONTEXT_ONLY'); assert.equal(docs['receipt_menards_2026-09-15.png'].status, 'UNSUPPORTED');
  for (const f of Object.keys(expect).slice(0, 9)) assert.equal(docs[f].status, 'READY', f + ' ' + docs[f].kindReason + ' ' + docs[f].warnings.join(' '));
  ok('all 11 Northstar files classified correctly with expected row counts (PDF, XLSX, CSV, DOCX, PNG)');
  const bank = docs['northstar_bank_statement_sep2026.pdf'];
  assert.equal(bank.rows[5].loc.startsWith('page 1, line'), true); assert.equal(parseMoneyMinor(bank.rows.find((r) => String(r.values.description).startsWith('FERGUSON'))!.values.amount as string), -241837);
  ok('PDF statement lines keep page/line provenance and signed amounts');

  // Evidence + leaks
  const normalized = [], records = [];
  for (const d of Object.values(docs)) { if (!['READY'].includes(d.status)) continue; const ev = documentToEvidence(d, { businessId: BIZ, importId: 'imp-' + d.id, complete: true }); normalized.push(...ev.normalized); records.push(...ev.records); }
  assert.ok(records.every((r) => r.sourceFile && r.sourceSheet && r.verification === 'OWNER_ENTERED'));
  ok(`documents normalized into ${normalized.length} rows and ${records.length} cited evidence records`);
  const exp = JSON.parse(await fs.readFile(path.join(dir, '..', 'northstar_expected_leaks.json'), 'utf8')).planted;
  const rep = runLeakEngines({ normalized, records, asOf: '2026-10-16' });
  const amt = (c: string) => rep.leaks.filter((l) => l.category === c).reduce((s, l) => s + (l.finding.impactMinor ?? 0), 0);
  assert.equal(amt('losing_months'), Math.round(exp.losing_months.total_loss * 100));
  assert.equal(amt('losing_jobs'), Math.round(exp.losing_jobs.total * 100));
  assert.equal(amt('overdue_invoices'), Math.round(exp.overdue_invoices.total * 100));
  assert.equal(amt('duplicate_charges'), Math.round((exp.duplicate_bank_charge.amount + exp.duplicate_card_charge.amount) * 100));
  assert.equal(amt('price_creep'), Math.round(exp.subscription_creep.excess_over_first * 100));
  assert.equal(amt('overlapping_subscriptions'), 53400);
  assert.equal(amt('overtime'), Math.round(exp.overtime.overtime_premium_estimate * 100));
  assert.equal(amt('processor_fees'), Math.round(exp.processor_fees.excess_over_2_9pct * 100));
  const trends = rep.leaks.filter((l) => l.category === 'cost_trend').map((l) => [l.finding.title.split(' up ')[0], l.finding.impactMinor]);
  assert.deepEqual(Object.fromEntries(trends), { Fuel: 311000, 'Software Subscriptions': 105000 });
  const under = rep.leaks.find((l) => l.category === 'underpriced_jobs')!; for (const j of exp.underpriced_jobs.jobs) assert.ok(under.details.some((d) => d.startsWith(j)), j);
  assert.ok(rep.leaks.every((l) => l.finding.sourceRecordIds.length > 0 && l.finding.recovery.length && l.finding.prevention.length));
  const ranked = rep.leaks.filter((l) => l.category !== 'revenue_trend'); for (let i = 1; i < ranked.length; i++) assert.ok((ranked[i - 1].finding.impactMinor ?? -1) >= (ranked[i].finding.impactMinor ?? -1));
  assert.equal(rep.leaks[rep.leaks.length - 1].category, 'revenue_trend');
  assert.ok(!/gusto|payroll/i.test(rep.checks.find((c) => c.category === 'vendor_concentration')!.note));
  assert.equal(amt('revenue_trend'), Math.round(exp.revenue_trend.decline * 100));
  assert.equal(amt('technician_contribution'), Math.round(exp.technician_contribution.total * 100));
  assert.equal(amt('callbacks'), Math.round(exp.callbacks.total * 100));
  assert.equal(amt('marketing_return'), Math.round(exp.marketing_return.total * 100));
  assert.equal(amt('labor_utilization'), Math.round(exp.labor_utilization.total * 100));
  for (const e of exp.labor_utilization.below_target) assert.ok(rep.leaks.find((l) => l.category === 'labor_utilization')!.finding.title.includes(e), e);
  assert.ok(rep.checks.find((c) => c.category === 'vendor_concentration')!.status !== 'NOT_ENOUGH_DATA');
  const caps = capabilityReport(normalized, records);
  for (const a of caps.analyses) assert.equal(a.status, 'AVAILABLE', `${a.name}: ${a.missing.join(' ')}`);
  assert.equal(caps.checklist.recommended.length + caps.checklist.optional.length, 0); assert.equal(caps.checklist.ready.length, 10);
  // Without timesheets / marketing / technician columns the readiness reasons are specific
  const lean = capabilityReport(normalized.filter((r) => !['timesheet', 'marketing'].includes(String(r.normalizedValues.doc_kind))), records);
  const reason = (id: string) => lean.analyses.find((a) => a.id === id)!.missing.join(' ');
  assert.match(reason('labor-utilization'), /billable_hours/); assert.match(reason('marketing-roi'), /marketing_spend/);
  const leanRep = runLeakEngines({ normalized: normalized.filter((r) => !['timesheet', 'marketing'].includes(String(r.normalizedValues.doc_kind))), records, asOf: '2026-10-16' });
  assert.match(leanRep.checks.find((c) => c.category === 'labor_utilization')!.note, /timesheets/); assert.match(leanRep.checks.find((c) => c.category === 'marketing_return')!.note, /marketing spend/);
  ok(`leak engines find every planted leak with exact amounts; ${rep.leaks.length} leaks ranked, recoverable ${rep.totalRecoverableMinor / 100}`);

  // Insufficient data stays explicit
  const thin = runLeakEngines({ normalized: normalized.filter((r) => r.datasetType === 'invoices'), records: records.filter((r) => r.metric.startsWith('invoice')), asOf: '2026-10-16' });
  assert.ok(thin.checks.filter((c) => c.status === 'NOT_ENOUGH_DATA').length >= 7); assert.equal(thin.leaks.length, 1);
  const blocked = await runSmartAnalysis({ businessId: BIZ, business: { name: 'Test' }, normalized: [], records: [], provider: async () => { throw new Error('must not be called'); } });
  assert.equal(blocked.status, 'NEED_MORE_DATA');
  ok('missing documents are reported as NOT_ENOUGH_DATA per check, and an empty workspace never calls the AI');

  // AI extraction is verified against the text: fabricated values are dropped
  const text = Buffer.from('Northstar notes\nVendor recap for September\nSep 4 paid Johnstone Supply 3,842.10 for parts\nSep 9 paid Winsupply 2,975.64\nTotal paid 6,817.74\nRent was 4,500.00 and insurance 3,100.00\nFuel 3,150.00\n');
  const stub = async () => ({ model: 'stub', value: { kind: 'bank_statement', reason: 'stub', rows: [
    { ...nulls(), line: 3, date: 'Sep 4', description: 'Johnstone Supply', amount: '3,842.10' }, { ...nulls(), line: 4, date: 'Sep 9', description: 'Winsupply', amount: '9,999.99' }, { ...nulls(), line: 99, date: null, description: 'Ghost', amount: '1.00' }] } });
  const ai = await extract('vendor_recap.txt', text, stub as never);
  assert.equal(ai.method, 'GROK_EXTRACTED'); assert.equal(ai.rows.length, 1); assert.equal(ai.rows[0].values.amount, '3,842.10'); assert.equal(ai.status, 'NEEDS_REVIEW'); assert.match(ai.warnings.join(' '), /2 AI-proposed row/);
  ok('AI-extracted rows survive only when every value appears on the cited line; fabricated amounts and lines are dropped');

  // OFX, legacy XLS, delimited TXT, JSON, unknown binary
  const ofx = Buffer.from('OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260903<TRNAMT>-89.00<FITID>1<NAME>QUICKFLEET GPS</STMTTRN>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260904<TRNAMT>-2418.37<FITID>2<NAME>FERGUSON SUPPLY</STMTTRN>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260905<TRNAMT>1200.00<FITID>3<NAME>DEPOSIT</STMTTRN>\n</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>');
  const o = await extract('checking.qbo', ofx); assert.equal(o.format, 'ofx'); assert.equal(o.kind, 'bank_statement'); assert.equal(o.rows.length, 3); assert.equal(o.status, 'READY');
  const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Job #', 'Completed Date', 'Revenue', 'Labor Cost', 'Material Cost'], ['J-1', '2026-09-01', 1000, 400, 700], ['J-2', '2026-09-02', 900, 300, 200]]), 'Jobs');
  const xls = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'biff8' })); const x = await extract('jobs_export.xls', xls); assert.equal(x.format, 'xls'); assert.equal(x.kind, 'job_costing'); assert.equal(x.rows.length, 2);
  const tsv = await extract('payroll.txt', Buffer.from('Pay Date\tEmployee\tRegular Hours\tOvertime Hours\tGross Wages\tOvertime Pay\n2026-09-04\tA. Smith\t80\t10\t2600.00\t450.00\n2026-09-18\tA. Smith\t80\t12\t2690.00\t540.00\n')); assert.equal(tsv.kind, 'payroll'); assert.equal(tsv.rows.length, 2);
  const js = await extract('fees.json', Buffer.from(JSON.stringify([{ date: '2026-09-28', gross: 1000, fee: 35.5, net: 964.5 }, { date: '2026-08-28', gross: 800, fee: 28.4, net: 771.6 }]))); assert.equal(js.kind, 'processor_fees'); assert.equal(js.rows.length, 2);
  const bin = await extract('archive.bin', Buffer.from([0, 1, 2, 3, 0, 5])); assert.equal(bin.status, 'UNSUPPORTED');
  assert.equal(sniffFormat(Buffer.from('%PDF-1.4'), 'renamed.csv').format, 'pdf');
  ok('OFX/QBO, legacy XLS, tab-delimited TXT, JSON and unknown binaries are handled; magic bytes beat file extensions');

  // Vision stub -> NEEDS_REVIEW, never auto-imported as verified
  const vis = await extract('receipt.png', await read('receipt_menards_2026-09-15.png'), (async () => ({ model: 'stub', value: { kind: 'receipt', reason: 'stub', rows: [{ ...nulls(), date: '09/15/2026', vendor: 'MENARDS', description: 'Plumbing parts', amount: '362.30' }] } })) as never);
  assert.equal(vis.method, 'GROK_VISION'); assert.equal(vis.status, 'NEEDS_REVIEW'); assert.equal(vis.rows.length, 1);
  let calls = 0; const flaky = (async () => ({ model: 'stub', value: { kind: 'receipt', reason: 'stub', rows: [{ ...nulls(), date: '09/15/2026', vendor: 'MENARDS', amount: ++calls === 1 ? null : '362.30' }] } })) as never;
  const vis2 = await extract('receipt.png', await read('receipt_menards_2026-09-15.png'), flaky); assert.equal(calls, 2); assert.equal(vis2.rows[0].values.amount, '362.30');
  let calls2 = 0; const blank = (async () => { calls2++; return { model: 'stub', value: { kind: 'receipt', reason: 'stub', rows: [{ ...nulls(), vendor: 'MENARDS' }] } }; }) as never;
  const vis3 = await extract('receipt.png', await read('receipt_menards_2026-09-15.png'), blank); assert.equal(calls2, 2); assert.equal(vis3.rows.length, 0); assert.match(vis3.warnings.join(' '), /could not read an amount/);
  ok('image receipts read by vision are marked for owner confirmation; a missing total is retried once, then reported');
  console.log(`ALL ${n} DOCUMENT INTAKE CHECKS PASSED.`);
}
function nulls() { return Object.fromEntries(['due_date', 'vendor', 'category', 'balance', 'invoice_id', 'customer', 'amount_paid', 'open_balance', 'job_id', 'job_type', 'revenue', 'labor_cost', 'material_cost', 'employee', 'regular_hours', 'overtime_hours', 'gross_wages', 'overtime_pay', 'gross', 'fee', 'net', 'net_profit', 'expenses', 'line', 'section', 'description', 'date', 'amount'].map((k) => [k, null])); }
main().catch((e) => { console.error(e); process.exit(1); });
