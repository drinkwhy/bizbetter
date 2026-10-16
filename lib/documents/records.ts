import { createHash } from 'crypto';
import type { IntakeImport, Metric, NormalizedBusinessRecord, SourceRecord } from '@/lib/evidence/model';
import { DOC_KINDS, type CanonicalRow, type CellValue, type DocKind, type ExtractedDocument } from './types';
import { parseAnyDate, parseMoneyMinor, parseNumber } from './parse';

export const DOCUMENT_MAPPING_VERSION = 'document-ingest-1';
const MONEY = new Set(['amount', 'debit', 'credit', 'balance', 'amount_paid', 'open_balance', 'revenue', 'labor_cost', 'material_cost', 'hourly_rate', 'gross_wages', 'overtime_pay', 'gross', 'fee', 'net', 'expenses', 'net_profit']);
const STOP = new Set(['the', 'inc', 'llc', 'co', 'monthly', 'subscription', 'payment', 'pmt', 'ach', 'autopay', 'pos', 'debit', 'purchase', 'online', 'www', 'com', 'recurring', 'card', 'sale']);
/** Stable vendor key: lowercase words without reference numbers or filler words. */
export const vendorKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9#\s&-]/g, ' ').split(/\s+/).filter((w) => w && !/\d/.test(w) && !STOP.has(w) && w.length > 1).join(' ');
const monthEnd = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); };

/** Signed transaction amount in cents (outflow negative). */
function signedAmount(r: CanonicalRow, flip: boolean): number | null {
  const a = parseMoneyMinor((r.values.amount ?? null) as CellValue);
  if (a !== null) return flip ? -a : a;
  const d = parseMoneyMinor((r.values.debit ?? null) as CellValue), c = parseMoneyMinor((r.values.credit ?? null) as CellValue);
  if (d === null && c === null) return null; return (c ?? 0) - Math.abs(d ?? 0);
}

export interface EvidenceResult { normalized: NormalizedBusinessRecord[]; records: SourceRecord[]; batch: IntakeImport; warnings: string[] }

/** Converts reviewed canonical rows into normalized rows + cited source records. Values come only from the file. */
export function documentToEvidence(doc: ExtractedDocument, opts: { businessId: string; importId: string; kind?: DocKind; excludedRows?: number[]; complete: boolean; now?: string }): EvidenceResult {
  const kind = opts.kind || doc.kind; const meta = DOC_KINDS[kind]; const now = opts.now || new Date().toISOString();
  const excluded = new Set(opts.excludedRows || []); const rows = doc.rows.filter((r) => !excluded.has(r.index));
  const warnings: string[] = []; const normalized: NormalizedBusinessRecord[] = []; const records: SourceRecord[] = [];
  const sourceSystem = `Document upload: ${meta.label}`; const currency = doc.currency || 'USD';
  const hasTotals = rows.some((r) => r.values.section === 'total_income');
  // Card exports differ in sign convention: if most amounts are positive, positive = charge.
  const cardAmounts = kind === 'card_statement' ? rows.map((r) => parseMoneyMinor((r.values.amount ?? null) as CellValue)).filter((x): x is number => x !== null) : [];
  const flip = kind === 'card_statement' && cardAmounts.length > 0 && cardAmounts.filter((x) => x > 0).length / cardAmounts.length > 0.7;
  if (flip) warnings.push('Card amounts are positive for charges in this export; treated positive amounts as charges.');
  for (const r of rows) {
    const date = parseAnyDate((r.values.date ?? null) as CellValue); const due = parseAnyDate((r.values.due_date ?? null) as CellValue);
    const nv: NormalizedBusinessRecord['normalizedValues'] = { doc_kind: kind };
    for (const [k, v] of Object.entries(r.values)) { if (v === null || v === undefined) continue; if (MONEY.has(k)) { const c = parseMoneyMinor(v as CellValue); nv[k] = c === null ? null : c / 100; } else if (k === 'regular_hours' || k === 'overtime_hours') nv[k] = parseNumber(v as CellValue); else nv[k] = typeof v === 'number' ? v : String(v).slice(0, 300); }
    if (date) nv.date = date; if (due) nv.due_date = due;
    let signed: number | null = null;
    if (kind === 'bank_statement' || kind === 'card_statement') { signed = signedAmount(r, flip); nv.amount = signed === null ? null : signed / 100; const desc = String(r.values.description || r.values.vendor || ''); nv.vendor = String(r.values.vendor || desc).slice(0, 200); nv.vendor_key = vendorKey(String(nv.vendor)); if (signed !== null && signed < 0) nv.expense = -signed / 100; }
    if (kind === 'receipt') { const a = parseMoneyMinor((r.values.amount ?? null) as CellValue); if (a !== null) { signed = -Math.abs(a); nv.amount = signed / 100; nv.expense = Math.abs(a) / 100; } nv.vendor = String(r.values.vendor || r.values.description || 'Receipt'); nv.vendor_key = vendorKey(String(nv.vendor)); }
    if (kind === 'job_costing' && nv.revenue === undefined && nv.amount !== undefined) nv.revenue = nv.amount;
    if (kind === 'invoices' && nv.amount === undefined && nv.revenue !== undefined) nv.amount = nv.revenue;
    if (kind === 'payroll' && nv.labor_cost === undefined && typeof nv.gross_wages === 'number') nv.labor_cost = nv.gross_wages;
    const nid = createHash('sha256').update(JSON.stringify([opts.businessId, opts.importId, r.index])).digest('hex');
    normalized.push({ id: nid, businessId: opts.businessId, importId: opts.importId, datasetType: meta.dataset, sourceSystem, sourceFile: doc.fileName, sourceSheet: r.loc, sourceRow: r.row ?? r.index + 1,
      originalRecordIdentifier: String(r.values.invoice_id || r.values.job_id || '') || undefined, originalValues: { ...r.values, _location: r.loc, ...(r.sourceText ? { _sourceText: r.sourceText } : {}) },
      normalizedValues: nv, mappingVersion: DOCUMENT_MAPPING_VERSION, sourceComplete: opts.complete, importedAt: now, quality: 'ACCEPTED' });
    if (!date) continue;
    const out: Array<{ metric: Metric; minor: number; entity?: string }> = [];
    const m = (f: string) => parseMoneyMinor((r.values as Record<string, CellValue>)[f] ?? null);
    const add = (metric: Metric, minor: number | null, entity?: string) => { if (minor !== null) out.push({ metric, minor, entity }); };
    switch (kind) {
      case 'pnl': {
        const sec = String(r.values.section || ''), line = String(r.values.line || '');
        if (sec) { const a = m('amount');
          if (sec === 'total_income') add('revenue', a, 'Total Income'); else if (sec === 'net_income') add('net_profit', a, 'Net Income'); else if (sec === 'total_expense') add('expenses', a, 'Total Expenses');
          else if (sec === 'total_cogs') add('cogs', a, 'Total COGS'); else if (sec === 'gross_profit') add('gross_profit', a, 'Gross Profit');
          else if (sec === 'income' || sec === 'other_income') add('revenue', hasTotals ? null : a, line); else if (sec === 'cogs') add('cogs', a, line); else add('expenses', a, line);
          if ((sec === 'income' || sec === 'other_income') && hasTotals) nv.line_revenue = a === null ? null : a / 100;
        } else { add('revenue', m('revenue')); add('expenses', m('expenses')); add('net_profit', m('net_profit')); }
        break; }
      case 'bank_statement': case 'card_statement': case 'receipt': if (signed !== null && signed < 0) add('vendor_spend', -signed, String(nv.vendor).slice(0, 120)); break;
      case 'invoices': { const id = String(r.values.invoice_id || '') || undefined; add('invoice_contract', m('amount') ?? m('revenue'), id); add('invoice_paid', m('amount_paid'), id); add('receivable', m('open_balance'), id); break; }
      case 'job_costing': { const id = String(r.values.job_id || '') || undefined; add('job_revenue', m('revenue') ?? m('amount'), id); add('job_labor', m('labor_cost'), id); add('job_materials', m('material_cost'), id); break; }
      case 'payroll': { const e = String(r.values.employee || '') || undefined; add('payroll_cost', m('gross_wages'), e); add('overtime_cost', m('overtime_pay'), e); break; }
      case 'processor_fees': { const f = m('fee'); add('fees', f === null ? null : Math.abs(f)); add('payment_gross', m('gross')); add('payment_net', m('net')); break; }
      default: break;
    }
    const periodStart = date, periodEnd = kind === 'pnl' && date.endsWith('-01') ? monthEnd(date) : date;
    for (const o of out) {
      const sourceRecordId = `${doc.sha256.slice(0, 12)}:${r.index}:${o.metric}`;
      records.push({ id: createHash('sha256').update(JSON.stringify([opts.businessId, opts.importId, sourceRecordId, o.minor])).digest('hex'), businessId: opts.businessId, environment: 'REAL', sourceSystem, sourceRecordId, syncId: opts.importId,
        periodStart, periodEnd, importedAt: now, metric: o.metric, value: o.minor, currency, decimals: 2, basis: `${meta.label} document; owner reviewed`, entityId: o.entity, complete: opts.complete,
        verification: 'OWNER_ENTERED', importId: opts.importId, normalizedRecordId: nid, sourceFile: doc.fileName, sourceSheet: r.loc, sourceRow: r.row ?? r.index + 1, originalRecordIdentifier: o.entity });
    }
  }
  const skipped = rows.length - normalized.filter((n) => typeof n.normalizedValues.date === 'string').length;
  if (skipped > 0) warnings.push(`${skipped} row(s) without a readable date were stored but create no dated evidence.`);
  const batch: IntakeImport = { id: opts.importId, businessId: opts.businessId, fileName: doc.fileName, fileType: 'document', datasetType: meta.dataset, sourceSystem, status: 'COMMITTED', rowCount: doc.rows.length,
    acceptedCount: normalized.length, duplicateCount: 0, invalidCount: excluded.size, sourceDigest: doc.sha256, mappingVersion: DOCUMENT_MAPPING_VERSION, mappings: [], createdAt: now, warnings: [...doc.warnings, ...warnings].slice(0, 40) };
  return { normalized, records, batch, warnings };
}
