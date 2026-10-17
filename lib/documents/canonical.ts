import type { CanonicalField, CanonicalRow, CellValue, DocKind } from './types';
import { parseAnyDate, parseMonth, parseMoneyMinor } from './parse';

export const normHeader = (h: CellValue) => String(h ?? '').toLowerCase().replace(/[^a-z0-9#%]+/g, ' ').trim();

/** Header aliases per canonical field (normalized). Kind-specific meaning is resolved later. */
const ALIASES: Partial<Record<CanonicalField, string[]>> = {
  date: ['date', 'transaction date', 'trans date', 'posted date', 'posting date', 'post date', 'invoice date', 'pay date', 'check date', 'pay period end', 'period end', 'month end', 'job date', 'completed date', 'completion date', 'date completed', 'created', 'created utc', 'created date', 'payout date', 'arrival date', 'month', 'period', 'txn date'],
  due_date: ['due date', 'due', 'payment due', 'date due'],
  description: ['description', 'memo', 'details', 'transaction description', 'narrative', 'name', 'payee', 'merchant', 'merchant name'],
  vendor: ['vendor', 'supplier', 'vendor name'],
  category: ['category', 'account', 'expense category', 'gl account', 'account name', 'class'],
  amount: ['amount', 'total', 'total amount', 'invoice amount', 'invoice total', 'original amount', 'transaction amount', 'amount usd', 'charge amount'],
  debit: ['debit', 'debits', 'withdrawal', 'withdrawals', 'money out', 'payments debits'],
  credit: ['credit', 'credits', 'deposit', 'deposits', 'money in'],
  balance: ['balance', 'running balance', 'ledger balance'],
  invoice_id: ['invoice #', 'invoice', 'invoice number', 'invoice no', 'invoice id', 'inv #', 'inv no', 'num', 'doc number'],
  customer: ['customer', 'client', 'customer name', 'client name', 'bill to'],
  amount_paid: ['amount paid', 'paid', 'paid amount', 'payments received', 'payment amount', 'total paid'],
  open_balance: ['open balance', 'balance due', 'amount due', 'outstanding', 'outstanding balance', 'unpaid'],
  status: ['status', 'payment status', 'invoice status'],
  job_id: ['job #', 'job id', 'job number', 'job no', 'work order', 'work order #', 'wo #', 'wo', 'ticket #'],
  job_type: ['job type', 'service type', 'type of work', 'service', 'job category'],
  revenue: ['revenue', 'job revenue', 'sales', 'price', 'total price', 'billed', 'billed amount', 'income', 'total revenue'],
  labor_cost: ['labor cost', 'labor', 'labor $', 'labour cost', 'labor costs'],
  material_cost: ['material cost', 'materials', 'material costs', 'parts cost', 'materials cost', 'parts'],
  employee: ['employee', 'employee name', 'worker', 'staff'],
  technician: ['technician', 'tech', 'assigned tech', 'lead tech', 'technician name'],
  labor_hours: ['labor hours', 'job hours', 'hours on job', 'labour hours'],
  billable_hours: ['billable hours', 'billed hours', 'on job hours'],
  nonbillable_hours: ['non billable hours', 'nonbillable hours', 'unbilled hours', 'non billable', 'drive shop hours'],
  lead_source: ['lead source', 'marketing source', 'campaign', 'channel', 'referral source', 'source'],
  callback: ['callback', 'is callback', 'rework', 'callback of', 'warranty callback'],
  spend: ['ad spend', 'spend', 'marketing spend', 'amount spent', 'cost'],
  leads: ['leads', 'lead count'],
  hours: ['total hours', 'hours worked', 'worked hours', 'duration hours', 'entry hours'],
  billable: ['billable', 'is billable', 'billable y n', 'billable flag'],
  regular_hours: ['regular hours', 'reg hours', 'reg hrs', 'regular hrs', 'hours'],
  overtime_hours: ['overtime hours', 'ot hours', 'ot hrs', 'overtime hrs', 'overtime'],
  hourly_rate: ['hourly rate', 'rate', 'pay rate'],
  gross_wages: ['gross wages', 'gross pay', 'total pay', 'gross earnings', 'total gross'],
  overtime_pay: ['overtime pay', 'ot pay', 'overtime earnings', 'ot earnings'],
  gross: ['gross volume', 'gross', 'gross amount', 'gross sales', 'charges', 'volume'],
  fee: ['fee', 'fees', 'processing fee', 'processing fees', 'stripe fee', 'merchant fee', 'merchant fees'],
  net: ['net', 'net amount', 'net payout', 'payout', 'net deposit', 'net settlement'],
  expenses: ['expenses', 'total expenses', 'expense'],
  net_profit: ['net profit', 'net income', 'profit', 'net'],
  currency: ['currency', 'ccy'],
};
const LOOKUP = new Map<string, CanonicalField[]>();
for (const [field, list] of Object.entries(ALIASES)) for (const a of list!) LOOKUP.set(a, [...(LOOKUP.get(a) || []), field as CanonicalField]);

/** Fields a header could mean; first is the generic default. */
export const candidatesFor = (h: CellValue) => LOOKUP.get(normHeader(h)) || [];

export interface Table { sheet: string; headerRow: number; headers: string[]; rows: CellValue[][]; rowNumbers: number[] }

/** Finds the header row within the first 25 rows (title rows above it are common in exports). */
export function toTable(sheet: string, grid: CellValue[][]): Table | null {
  let best = -1, score = 0;
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const cells = grid[i] || []; const s = cells.filter((c) => typeof c === 'string' && (candidatesFor(c).length || parseMonth(c))).length;
    if (s > score) { score = s; best = i; }
  }
  if (best < 0 || score < 2) return null;
  const headers = (grid[best] || []).map((h, i) => (h === null || h === '' ? `Column ${i + 1}` : String(h).trim()));
  const rows: CellValue[][] = [], rowNumbers: number[] = [];
  for (let i = best + 1; i < grid.length; i++) { if ((grid[i] || []).some((c) => c !== null && c !== '')) { rows.push(grid[i]); rowNumbers.push(i + 1); } }
  return { sheet, headerRow: best + 1, headers, rows, rowNumbers };
}

export const monthColumns = (t: Table) => t.headers.map((h, i) => ({ i, month: parseMonth(h) })).filter((x): x is { i: number; month: string } => !!x.month);
export const isWidePnl = (t: Table) => monthColumns(t).length >= 3;

/** Resolves header -> field for a given document kind; prefers kind-specific meanings. */
export function mapColumns(headers: string[], kind: DocKind): Array<CanonicalField | null> {
  const prefer: Partial<Record<DocKind, CanonicalField[]>> = {
    job_costing: ['job_id', 'revenue', 'labor_cost', 'material_cost', 'job_type', 'customer', 'date', 'technician', 'labor_hours', 'lead_source', 'callback'],
    timesheet: ['employee', 'date', 'billable_hours', 'nonbillable_hours', 'hours', 'billable', 'job_id'],
    marketing: ['date', 'lead_source', 'spend', 'leads'],
    invoices: ['invoice_id', 'customer', 'amount', 'amount_paid', 'open_balance', 'due_date', 'status', 'date'],
    payroll: ['employee', 'regular_hours', 'overtime_hours', 'hourly_rate', 'gross_wages', 'overtime_pay', 'date'],
    processor_fees: ['gross', 'fee', 'net', 'date', 'currency'],
    bank_statement: ['date', 'description', 'amount', 'debit', 'credit', 'balance', 'category'],
    card_statement: ['date', 'description', 'amount', 'debit', 'credit', 'category'],
    pnl: ['date', 'revenue', 'expenses', 'net_profit'],
  };
  const used = new Set<CanonicalField>();
  return headers.map((h) => {
    const c = candidatesFor(h).filter((f) => !used.has(f)); if (!c.length) return null;
    const p = prefer[kind]; const pick = (p && c.find((f) => p.includes(f))) || c[0];
    // "Post Date" after "Transaction Date": keep the first date column only.
    used.add(pick); return pick;
  });
}

const has = (f: Array<CanonicalField | null>, ...x: CanonicalField[]) => x.some((k) => f.includes(k));

/** Deterministic document-kind scoring from headers, filename and text. */
export function scoreKind(fileName: string, headers: string[], text = ''): { kind: DocKind; confidence: number; reason: string } {
  const name = fileName.toLowerCase(), t = text.toLowerCase().slice(0, 4000);
  const f = headers.map((h) => candidatesFor(h)).flat();
  const s: Record<DocKind, number> = { pnl: 0, bank_statement: 0, card_statement: 0, invoices: 0, job_costing: 0, payroll: 0, processor_fees: 0, timesheet: 0, marketing: 0, receipt: 0, business_notes: 0, unknown: 0 };
  const why: string[] = [];
  if (f.includes('job_id')) s.job_costing += 3; if (has(f as CanonicalField[], 'labor_cost')) s.job_costing += 2; if (has(f as CanonicalField[], 'material_cost')) s.job_costing += 2;
  if (f.includes('invoice_id')) s.invoices += 3; if (f.includes('due_date')) s.invoices += 2; if (has(f as CanonicalField[], 'amount_paid', 'open_balance')) s.invoices += 2;
  if (f.includes('employee')) s.payroll += 2; if (has(f as CanonicalField[], 'overtime_hours', 'regular_hours')) s.payroll += 2; if (has(f as CanonicalField[], 'gross_wages', 'overtime_pay')) s.payroll += 3;
  if (has(f as CanonicalField[], 'billable_hours', 'nonbillable_hours')) s.timesheet += 6;
  // Clock-in/out time entries: one row per entry with a billable flag and the hours worked.
  const nh = headers.map(normHeader);
  if (f.includes('billable') && has(f as CanonicalField[], 'hours', 'regular_hours')) { s.timesheet += 6; why.push('billable flag with hours'); }
  if (nh.some((h) => /^(clock|time|punch) (in|out)$/.test(h))) { s.timesheet += 3; why.push('clock in/out columns'); }
  if (f.includes('spend') && f.includes('lead_source') && !f.includes('job_id')) s.marketing += 6;
  if (f.includes('fee')) s.processor_fees += 3; if (f.includes('net')) s.processor_fees += 1; if (f.includes('gross')) s.processor_fees += 2;
  const txn = (f.includes('date') ? 1 : 0) + (f.includes('description') ? 2 : 0) + (has(f as CanonicalField[], 'amount', 'debit', 'credit') ? 2 : 0);
  s.bank_statement += txn + (f.includes('balance') ? 2 : 0); s.card_statement += txn;
  // A dated, row-per-transaction table (bank/QuickBooks/GL/card export) is a transaction ledger, never a P&L:
  // P&L statements summarize by account and carry no per-row dates. Card evidence decides card vs bank.
  const ledger = f.includes('date') && has(f as CanonicalField[], 'amount', 'debit', 'credit') && has(f as CanonicalField[], 'description', 'category', 'vendor')
    && !has(f as CanonicalField[], 'job_id', 'gross_wages', 'billable_hours', 'billable', 'fee', 'spend');
  const cardHeader = nh.some((h) => /\b(card|cardholder|card member|card number|card no|last 4)\b/.test(h)) || (nh.includes('transaction date') && nh.includes('post date') && !f.includes('balance'));
  if (ledger) { if (cardHeader) { s.card_statement += 3; why.push('card transaction layout'); } else { s.bank_statement += 2; why.push('transaction ledger layout (dated rows with amounts)'); } s.pnl -= 4; }
  if (ledger && f.includes('debit') && f.includes('credit') && f.includes('category') && !f.includes('balance')) why.push('general-ledger debit/credit columns');
  if (headers.filter((h) => parseMonth(h)).length >= 3) { s.pnl += 6; why.push('month columns'); }
  if (/net income|total income|gross profit|profit and loss|income statement/.test(t)) s.pnl += 3;
  const hint: Array<[RegExp, DocKind]> = [[/p ?& ?l|profit|income.?statement/, 'pnl'], [/bank|checking|savings/, 'bank_statement'], [/card|visa|amex|mastercard|discover/, 'card_statement'], [/invoice|(^|[^a-z])a[\/&]?r([^a-z]|$)|aging|receivable/, 'invoices'], [/ledger|transaction|(^|[^a-z])gl([^a-z]|$)/, 'bank_statement'], [/job/, 'job_costing'], [/payroll|wage/, 'payroll'], [/timesheet|time.?entr|time.?card/, 'timesheet'], [/marketing|advertis|ad.?spend|lead.?source/, 'marketing'], [/stripe|square|payout|processor|merchant|fees/, 'processor_fees'], [/receipt/, 'receipt'], [/notes?|memo|about/, 'business_notes']];
  for (const [re, k] of hint) if (re.test(name)) { s[k] += 2; why.push(`file name suggests ${k.replace('_', ' ')}`); }
  if (/credit card|card ending|visa|mastercard|american express/.test(t)) s.card_statement += 2;
  if (/checking|savings account|bank statement|statement period/.test(t)) s.bank_statement += 2;
  if (/payroll|gross pay|net pay|employer (cost|taxes)|pay date/.test(t)) s.payroll += 3;
  const ranked = (Object.entries(s) as Array<[DocKind, number]>).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const confidence = top[1] >= 5 && top[1] - second[1] >= 2 ? 0.9 : top[1] >= 4 && top[1] > second[1] ? 0.7 : top[1] >= 3 ? 0.5 : 0.2;
  return { kind: top[1] >= 2 ? top[0] : 'unknown', confidence, reason: `Deterministic score ${top[1]} (next ${second[0].replace('_', ' ')} ${second[1]})${why.length ? '; ' + Array.from(new Set(why)).join(', ') : ''}; headers: ${headers.slice(0, 8).join(', ')}` };
}

/** Converts a long-form table into canonical rows using a column mapping. */
export function tableRows(t: Table, mapping: Array<CanonicalField | null>, locPrefix: string): CanonicalRow[] {
  return t.rows.map((r, k) => {
    const values: CanonicalRow['values'] = {};
    mapping.forEach((f, i) => { if (f && r[i] !== null && r[i] !== undefined && r[i] !== '') values[f] = r[i]; });
    return { index: k, loc: `${locPrefix} row ${t.rowNumbers[k]}`, sheet: t.sheet, row: t.rowNumbers[k], values };
  }).filter((r) => Object.keys(r.values).length > 0);
}

/** Line classification for wide P&L statements. */
export function pnlLineType(label: string, section: string): string {
  const l = label.toLowerCase().trim();
  if (/^net (operating )?(income|profit|loss|earnings)|^net income/.test(l)) return 'net_income';
  if (/^total (income|revenue|sales|operating revenue)|^(gross|total) (sales|revenue)$/.test(l)) return 'total_income';
  if (/^gross profit/.test(l)) return 'gross_profit';
  if (/^total (cost of goods sold|cogs|cost of sales|direct costs?)/.test(l)) return 'total_cogs';
  if (/^total (operating )?expenses?$/.test(l)) return 'total_expense';
  if (/^total /.test(l)) return 'subtotal';
  return section || 'expense';
}
const sectionOf = (label: string): string | null => {
  const l = label.toLowerCase();
  if (/other income/.test(l)) return 'other_income'; if (/other expense/.test(l)) return 'other_expense';
  if (/cost of goods|cogs|cost of sales|direct cost/.test(l)) return 'cogs';
  if (/^(ordinary )?(income|revenue|sales)/.test(l)) return 'income';
  if (/expense/.test(l)) return 'expense';
  return null;
};

/** Pivots a wide P&L (accounts as rows, months as columns) into one canonical row per account per month. */
export function pivotPnl(t: Table, locPrefix: string): CanonicalRow[] {
  const months = monthColumns(t); const out: CanonicalRow[] = []; let section = ''; let k = 0;
  const labelCol = t.headers.findIndex((_, i) => !months.some((m) => m.i === i));
  for (let r = 0; r < t.rows.length; r++) {
    const row = t.rows[r]; const label = String(row[labelCol < 0 ? 0 : labelCol] ?? '').trim(); if (!label) continue;
    const numeric = months.filter((m) => parseMoneyMinor(row[m.i]) !== null);
    if (!numeric.length) { section = sectionOf(label) || section; continue; }
    const type = pnlLineType(label, section);
    if (type === 'subtotal') continue;
    for (const m of numeric) {
      const col = String.fromCharCode(65 + m.i);
      out.push({ index: k++, loc: `${locPrefix} row ${t.rowNumbers[r]}, column ${col} (${t.headers[m.i]})`, sheet: t.sheet, row: t.rowNumbers[r],
        values: { date: m.month + '-01', line: label, section: type, amount: row[m.i] } });
    }
  }
  return out;
}

/** Statement lines such as "09/08  FERGUSON SUPPLY ACH  -2,418.37  41,229.11". */
const LINE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2}|[A-Za-z]{3}\s\d{1,2})\s+(.+?)\s+(\(?-?\$?[\d,]+\.\d{2}\)?-?)(?:\s+(\(?-?\$?[\d,]+\.\d{2}\)?-?))?\s*$/;
export function parseStatementLines(pages: string[][]): { rows: CanonicalRow[]; year?: number } {
  const all = pages.flat().join('\n');
  const yearMatch = all.match(/\b\d{1,2}\/\d{1,2}\/(20\d{2})\b/) || all.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const rows: CanonicalRow[] = []; let prevBalance: number | null = null; let k = 0;
  pages.forEach((lines, p) => lines.forEach((line, n) => {
    const m = line.replace(/\s+/g, ' ').trim().match(LINE); if (!m) return;
    const desc = m[2].trim();
    if ((desc.match(/\d[\d,]*\.\d{2}\b/g) || []).length >= 2) return; // multi-amount summary row (e.g. payroll by pay date), not a transaction
    const one = m[4] === undefined;
    const balance = one ? null : parseMoneyMinor(m[4]);
    if (/opening|beginning|previous|closing|ending|starting/i.test(desc) && /balance/i.test(desc)) { prevBalance = parseMoneyMinor(m[3]); return; }
    let amountText = m[3]; let amount = parseMoneyMinor(amountText);
    if (amount === null) return;
    // Sign from the running balance when the amount column is unsigned.
    if (balance !== null && prevBalance !== null && amount > 0 && balance - prevBalance === -amount) amountText = '-' + amountText;
    if (balance !== null) prevBalance = balance;
    amount = parseMoneyMinor(amountText);
    rows.push({ index: k++, loc: `page ${p + 1}, line ${n + 1}`, page: p + 1, row: n + 1, sourceText: line.trim(),
      values: { date: parseAnyDate(m[1], year) ?? m[1], description: desc, amount: amountText, ...(m[4] ? { balance: m[4] } : {}) } });
  }));
  return { rows, year };
}

const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MI: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad2 = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Reporting period from a statement title, e.g. "January 1 - September 30, 2026", "Jan - Sep 2026", "October 2025 - September 2026", "September 2026". */
export function parsePeriod(text: string): { start: string; end: string } | null {
  const t = text.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  let m = t.match(/(\d{4})-(\d{2})-(\d{2}) (?:-|to|through|–) (\d{4})-(\d{2})-(\d{2})/);
  if (m) return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}) ?(?:-|to|through|–) ?(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { start: `${m[3]}-${pad2(+m[1])}-${pad2(+m[2])}`, end: `${m[6]}-${pad2(+m[4])}-${pad2(+m[5])}` };
  m = t.match(new RegExp(`${MONTH_RE}(?: \\d{1,2})?(?: (\\d{4}))? ?(?:-|to|through|–) ?${MONTH_RE}(?: (\\d{1,2}))?(?: (\\d{4}))`));
  if (m) { const y2 = +m[5], m1 = MI[m[1].slice(0, 3)], m2 = MI[m[3].slice(0, 3)]; const y1 = m[2] ? +m[2] : m1 > m2 ? y2 - 1 : y2;
    return { start: `${y1}-${pad2(m1)}-01`, end: `${y2}-${pad2(m2)}-${pad2(m[4] ? +m[4] : lastDay(y2, m2))}` }; }
  m = t.match(new RegExp(`(?:^|[^a-z])${MONTH_RE} (\\d{4})(?![\\d/-])`));
  if (m) { const y = +m[2], mo = MI[m[1].slice(0, 3)]; return { start: `${y}-${pad2(mo)}-01`, end: `${y}-${pad2(mo)}-${pad2(lastDay(y, mo))}` }; }
  return null;
}

const PNL_MARKER = /^(total (income|revenue|sales)|gross profit|total (operating )?expenses?|net (operating )?(income|profit|loss)|total cost of (goods sold|sales))\b/i;

/**
 * Single-period P&L (accounts as rows, one amount column), e.g. a QuickBooks "Profit and Loss" export with a
 * "Total" column. Detected by its subtotal lines; the reporting period comes from the title rows or a month header.
 */
export function singlePeriodPnl(sheet: string, grid: CellValue[][], locPrefix: string): { rows: CanonicalRow[]; period: { start: string; end: string } | null } | null {
  const label = (r: CellValue[]) => String((r || []).find((c) => typeof c === 'string' && c.trim()) ?? '').trim();
  const markers = grid.filter((r) => PNL_MARKER.test(label(r)) && (r || []).some((c) => parseMoneyMinor(c) !== null));
  if (markers.length < 2) return null;
  // Dated rows mean a transaction list, not a statement.
  if (grid.filter((r) => (r || []).some((c) => typeof c === 'string' && /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(c.trim()))).length >= 3) return null;
  const headerIdx = grid.findIndex((r) => (r || []).some((c) => typeof c === 'string' && /^(total|amount|balance)$/i.test(c.trim()) || !!parseMonth(c)));
  if (headerIdx >= 0 && (grid[headerIdx] || []).filter((c) => parseMonth(c)).length >= 3) return null; // wide P&L handled elsewhere
  const colCounts = new Map<number, number>();
  for (const r of markers) { const i = (r || []).map((c, j) => (parseMoneyMinor(c) !== null ? j : -1)).filter((j) => j > 0).pop(); if (i !== undefined) colCounts.set(i, (colCounts.get(i) || 0) + 1); }
  const col = Array.from(colCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]; if (col === undefined) return null;
  const head = headerIdx >= 0 ? grid[headerIdx][col] : null; const headMonth = parseMonth(head);
  const title = grid.slice(0, Math.max(headerIdx, 0) + 1).map((r) => (r || []).filter((c) => c !== null && c !== '').join(' ')).join(' \n ');
  const period = headMonth ? parsePeriod(`${String(head)}`) : parsePeriod(title);
  const out: CanonicalRow[] = []; let section = ''; let k = 0;
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r] || []; const name = label(row); if (!name) continue;
    const amount = row[col]; if (parseMoneyMinor(amount) === null) { section = sectionOf(name) || section; continue; }
    const type = pnlLineType(name, section); if (type === 'subtotal') continue;
    out.push({ index: k++, loc: `${locPrefix} row ${r + 1}, column ${String.fromCharCode(65 + col)}`, sheet, row: r + 1,
      values: { ...(period ? { date: period.start, period_end: period.end } : {}), line: name, section: type, amount } });
  }
  return out.length ? { rows: out, period } : null;
}
