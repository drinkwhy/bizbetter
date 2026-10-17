/**
 * Document-type detection for transaction ledgers vs P&L statements (fixtures in scripts/fixtures/documents).
 * Every ledger must import as bank/card transactions without manual changes; P&Ls must stay P&Ls.
 * If the untracked mock folder mock-business/northstar/statements exists, its files are checked too.
 */
import assert from 'node:assert/strict';
import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { extractDocument, type ExtractOptions } from '@/lib/documents/extract';
import { documentToEvidence } from '@/lib/documents/records';
import { parsePeriod } from '@/lib/documents/canonical';
import type { DocKind } from '@/lib/documents/types';

const dir = path.join(__dirname, 'fixtures', 'documents'); let n = 0; let ids = 0;
const ok = (m: string) => { n++; console.log('PASS ' + m); };
const extract = async (file: string, aiCall: ExtractOptions['aiCall'] = null) =>
  extractDocument({ id: '00000000-0000-4000-8000-' + String(++ids).padStart(12, '0'), businessId: 'ledger-test', fileName: path.basename(file), storedAs: 'x', buf: await fs.readFile(file) }, { aiCall });

async function main() {
  // minRecords: bank/card ledgers create one vendor-spend record per outflow.
  const expect: Array<[string, DocKind, number]> = [
    ['bank_export_2026.csv', 'bank_statement', 3], ['QBO_TransactionDetailByAccount.csv', 'bank_statement', 3], ['general_ledger_q3.csv', 'bank_statement', 3],
    ['Chase_Activity_20260930.csv', 'card_statement', 3], ['amex_statement_export.csv', 'card_statement', 2], ['testco_ledger_apr-sep2026.csv', 'bank_statement', 5],
    ['pnl_by_month_2026.csv', 'pnl', 0], ['QBO_ProfitAndLoss.csv', 'pnl', 0], ['pnl_september_2026.csv', 'pnl', 0], ['time_entries_sep2026.csv', 'timesheet', 4],
  ];
  for (const [file, kind, minRecords] of expect) {
    const doc = await extract(path.join(dir, file));
    assert.equal(doc.kind, kind, `${file}: expected ${kind}, got ${doc.kind} (${doc.kindReason})`);
    assert.equal(doc.method, 'DETERMINISTIC', `${file}: decided without AI`);
    assert.equal(doc.status, 'READY', `${file}: READY without manual changes (got ${doc.status}: ${doc.warnings.join(' | ')})`);
    const ev = documentToEvidence(doc, { businessId: 'ledger-test', importId: 'imp-' + file, complete: true, now: '2026-10-17T00:00:00.000Z' });
    assert.ok(ev.records.length >= (minRecords || 1), `${file}: ${ev.records.length} records`);
    ok(`${file} -> ${kind} (${doc.kindConfidence}), ${ev.records.length} records`);
  }

  // Signs and periods come through correctly.
  const bank = documentToEvidence(await extract(path.join(dir, 'testco_ledger_apr-sep2026.csv')), { businessId: 'ledger-test', importId: 'b', complete: true });
  assert.equal(bank.records.filter((r) => r.metric === 'vendor_spend').length, 5, 'expenses become vendor spend; revenue rows do not');
  const amex = documentToEvidence(await extract(path.join(dir, 'amex_statement_export.csv')), { businessId: 'ledger-test', importId: 'a', complete: true });
  assert.deepEqual(amex.records.filter((r) => r.metric === 'vendor_spend').map((r) => r.value).sort((a, b) => a - b), [31842, 120000], 'positive card charges are spend, the autopay credit is not');
  const qbo = documentToEvidence(await extract(path.join(dir, 'QBO_ProfitAndLoss.csv')), { businessId: 'ledger-test', importId: 'q', complete: true });
  const ti = qbo.records.find((r) => r.metric === 'revenue')!; assert.equal(ti.value, 28_000_000); assert.equal(ti.periodStart, '2026-01-01'); assert.equal(ti.periodEnd, '2026-09-30');
  const sep = documentToEvidence(await extract(path.join(dir, 'pnl_september_2026.csv')), { businessId: 'ledger-test', importId: 's', complete: true });
  assert.ok(sep.records.every((r) => r.periodStart === '2026-09-01' && r.periodEnd === '2026-09-30'));
  const gl = await extract(path.join(dir, 'general_ledger_q3.csv')); assert.match(gl.warnings.join(' '), /general-ledger/);
  const time = await extract(path.join(dir, 'time_entries_sep2026.csv'));
  assert.deepEqual(time.rows.map((r) => [r.values.billable_hours == null ? null : Number(r.values.billable_hours), r.values.nonbillable_hours == null ? null : Number(r.values.nonbillable_hours)]), [[null, 0.7], [3.3, null], [null, 0.5], [4, null]]);
  ok('ledger signs, card charge convention, single-period P&L dates and time-entry billable split are correct');

  assert.deepEqual(parsePeriod('January 1 - September 30, 2026'), { start: '2026-01-01', end: '2026-09-30' });
  assert.deepEqual(parsePeriod('October 2025 - September 2026'), { start: '2025-10-01', end: '2026-09-30' });
  assert.deepEqual(parsePeriod('Nov - Feb 2026'), { start: '2025-11-01', end: '2026-02-28' });
  assert.deepEqual(parsePeriod('For September 2026'), { start: '2026-09-01', end: '2026-09-30' });
  assert.deepEqual(parsePeriod('01/01/2026 - 06/30/2026'), { start: '2026-01-01', end: '2026-06-30' });
  ok('P&L reporting periods are read from statement titles');

  // An ambiguous dated table: Grok may suggest P&L, but a dated row-per-transaction table is never relabelled a P&L.
  const tmp = path.join(os.tmpdir(), `bizbetter-upload-${process.pid}.csv`); // neutral name: no file-name hint
  await fs.writeFile(tmp, 'Date,Amount\n2026-09-01,-100.00\n2026-09-02,250.00\n2026-09-03,-75.10\n');
  try {
    const stub = async () => ({ model: 'stub', value: { kind: 'pnl', confidence: 'MEDIUM', reason: 'stub', columns: [] } });
    const amb = await extract(tmp, stub as never);
    assert.ok(amb.kindConfidence < 0.6 || amb.warnings.length, 'ambiguous table reaches the AI step'); assert.notEqual(amb.kind, 'pnl'); assert.match(amb.warnings.join(' '), /AI suggested "profit & loss"/);
  } finally { await fs.rm(tmp, { force: true }); }
  ok('an AI "P&L" label is refused for a dated transaction table');

  // Optional: the generated Northstar statement set (untracked mock folder).
  const st = path.join(__dirname, '..', 'mock-business', 'northstar', 'statements');
  if (existsSync(st)) {
    const want: Array<[RegExp, DocKind]> = [[/bank_transactions.*\.csv$/, 'bank_statement'], [/card_transactions.*\.csv$/, 'card_statement'], [/time_entries.*\.csv$/, 'timesheet'], [/timesheets_weekly_summary.*\.csv$/, 'timesheet'],
      [/timesheets_weekly_.*\.xlsx$/, 'timesheet'], [/payroll_register_2026-09-18\.xlsx$/, 'payroll'], [/payroll_registers_all.*\.xlsx$/, 'payroll'], [/bank_statement_2026-0[19]\.pdf$/, 'bank_statement'], [/card_statement_2026-0[19]\.pdf$/, 'card_statement']];
    const all: string[] = []; const walk = async (d: string) => { for (const e of await fs.readdir(d, { withFileTypes: true })) e.isDirectory() ? await walk(path.join(d, e.name)) : all.push(path.join(d, e.name)); }; await walk(st);
    for (const [re, kind] of want) for (const f of all.filter((x) => re.test(x.replace(/\\/g, '/')))) {
      const doc = await extract(f); assert.equal(doc.kind, kind, `${path.basename(f)}: expected ${kind}, got ${doc.kind} (${doc.kindReason})`);
      assert.ok(['READY'].includes(doc.status), `${path.basename(f)} status ${doc.status}: ${doc.warnings.join(' | ')}`);
    }
    for (const f of all.filter((x) => /payroll_summary_.*\.pdf$/.test(x))) { const doc = await extract(f); assert.notEqual(doc.kind, 'bank_statement', `${path.basename(f)} must not be read as bank lines`); }
    ok('Northstar statements folder: bank/card CSV + PDFs, payroll registers, timesheets classify correctly; payroll summary PDFs are not read as bank lines');
  } else console.log('SKIP Northstar statements folder not present');
  console.log(`ALL ${n} LEDGER DETECTION CHECKS PASSED.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
