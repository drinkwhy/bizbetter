import { createHash, randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import type { DatasetType, Metric } from '@/lib/evidence/model';
import { classifyWithProfiles, mapWithProfiles } from '@/lib/intake/profiles';

export const MAX_FILE_BYTES = 8 * 1024 * 1024,
  MAX_ROWS = 10000,
  MAX_COLUMNS = 128,
  // Bumped: Toast POS profile + extensible source profiles
  MAPPING_VERSION = 'intake-map-2';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  reason: string;
  confirmed: boolean;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  classification: DatasetType;
  mappings: ColumnMapping[];
  dateRange: { start: string; end: string } | null;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim();

const aliases: Record<string, { field: string; confidence: number; reason: string }> = {
  'job id': { field: 'job_id', confidence: 0.99, reason: 'Exact stable job identifier.' },
  'job number': { field: 'job_id', confidence: 0.97, reason: 'Common stable job identifier.' },
  'job #': { field: 'job_id', confidence: 0.96, reason: 'Common stable job identifier.' },
  'work order': { field: 'job_id', confidence: 0.92, reason: 'Work-order identifier; verify it uniquely identifies a job.' },
  tech: { field: 'technician', confidence: 0.92, reason: 'Common technician abbreviation.' },
  technician: { field: 'technician', confidence: 0.99, reason: 'Exact field label.' },
  employee: { field: 'employee', confidence: 0.95, reason: 'Employee label.' },
  'employee name': { field: 'employee', confidence: 0.98, reason: 'Employee name label.' },
  'labor hrs': { field: 'labor_hours', confidence: 0.97, reason: 'Common labor-hours abbreviation.' },
  'labor hours': { field: 'labor_hours', confidence: 0.99, reason: 'Exact field label.' },
  'hours worked': { field: 'labor_hours', confidence: 0.9, reason: 'Hours worked; confirm these are job-attributed hours.' },
  'overtime hours': { field: 'overtime_hours', confidence: 0.99, reason: 'Exact field label.' },
  'ot hours': { field: 'overtime_hours', confidence: 0.97, reason: 'Common overtime abbreviation.' },
  'material cost': { field: 'material_cost', confidence: 0.99, reason: 'Exact field label.' },
  materials: { field: 'material_cost', confidence: 0.73, reason: 'Materials can be quantity or cost; verify.' },
  total: { field: 'amount', confidence: 0.58, reason: 'Ambiguous total; could be revenue, expense, balance, or quantity.' },
  amount: { field: 'amount', confidence: 0.62, reason: 'Generic amount; meaning depends on report and sign convention.' },
  'total amount': { field: 'amount', confidence: 0.66, reason: 'Generic total amount; confirm meaning.' },
  revenue: { field: 'revenue', confidence: 0.99, reason: 'Exact financial concept.' },
  sales: { field: 'revenue', confidence: 0.91, reason: 'Often sales revenue; verify returns/tax treatment.' },
  'invoice total': { field: 'revenue', confidence: 0.88, reason: 'Invoice total may include tax or adjustments.' },
  'net income': { field: 'net_profit', confidence: 0.99, reason: 'Exact accounting result label.' },
  'net profit': { field: 'net_profit', confidence: 0.99, reason: 'Exact accounting result label.' },
  'labor cost': { field: 'labor_cost', confidence: 0.98, reason: 'Exact cost label.' },
  labor: { field: 'labor_cost', confidence: 0.75, reason: 'Could mean hours, roles, or cost; verify.' },
  expense: { field: 'expense', confidence: 0.96, reason: 'Expense label.' },
  debit: { field: 'expense', confidence: 0.87, reason: 'Debit is not universally an expense; validate account classification.' },
  vendor: { field: 'vendor', confidence: 0.98, reason: 'Exact entity label.' },
  'vendor name': { field: 'vendor', confidence: 0.99, reason: 'Exact entity label.' },
  supplier: { field: 'vendor', confidence: 0.94, reason: 'Supplier label.' },
  customer: { field: 'customer', confidence: 0.99, reason: 'Exact entity label.' },
  'customer name': { field: 'customer', confidence: 0.99, reason: 'Exact entity label.' },
  invoice: { field: 'invoice_id', confidence: 0.87, reason: 'Invoice identifier.' },
  'invoice #': { field: 'invoice_id', confidence: 0.98, reason: 'Common invoice identifier.' },
  'invoice number': { field: 'invoice_id', confidence: 0.99, reason: 'Exact field label.' },
  date: { field: 'date', confidence: 0.88, reason: 'Date label; confirm which business date it represents.' },
  'transaction date': { field: 'date', confidence: 0.97, reason: 'Transaction date label.' },
  'job date': { field: 'date', confidence: 0.96, reason: 'Job date label.' },
  'completed date': { field: 'date', confidence: 0.94, reason: 'Completion date label.' },
  account: { field: 'account', confidence: 0.96, reason: 'Account label.' },
  'account name': { field: 'account', confidence: 0.98, reason: 'Account name label.' },
  category: { field: 'category', confidence: 0.9, reason: 'Category label.' },
  'expense category': { field: 'category', confidence: 0.97, reason: 'Expense category label.' },
  'lead source': { field: 'marketing_source', confidence: 0.99, reason: 'Exact marketing attribution field.' },
  'marketing source': { field: 'marketing_source', confidence: 0.99, reason: 'Exact field label.' },
  'marketing spend': { field: 'marketing_spend', confidence: 0.99, reason: 'Exact field label.' },
  'ad spend': { field: 'marketing_spend', confidence: 0.95, reason: 'Common advertising spend label.' },
  callback: { field: 'callback_indicator', confidence: 0.94, reason: 'Callback indicator label; normalize only explicit values.' },
  'estimate status': { field: 'estimate_outcome', confidence: 0.99, reason: 'Exact estimate outcome label.' },
  currency: { field: 'currency', confidence: 0.99, reason: 'Currency code/name label.' },
  'currency code': { field: 'currency', confidence: 0.99, reason: 'Exact currency code label.' },
  'order no': { field: 'job_id', confidence: 0.92, reason: 'Order identifier; confirm it is a job ID.' },
  'service type': { field: 'service_type', confidence: 0.96, reason: 'Service type label.' },
  'job type': { field: 'job_type', confidence: 0.96, reason: 'Job type label.' },
  'regular hours': { field: 'regular_hours', confidence: 0.99, reason: 'Regular hours label.' },
  'gross wages': { field: 'gross_wages', confidence: 0.99, reason: 'Payroll gross wages label.' },
  'employer cost': { field: 'employer_cost', confidence: 0.98, reason: 'Employer cost label.' },
  'employer taxes': { field: 'employer_cost', confidence: 0.94, reason: 'Employer payroll tax/cost label; verify included components.' },
  campaign: { field: 'campaign', confidence: 0.95, reason: 'Campaign label.' },
  'campaign name': { field: 'campaign', confidence: 0.98, reason: 'Campaign name label.' },
  'zip code': { field: 'geography', confidence: 0.9, reason: 'Postal geography label; location resolution is not inferred.' },
  'callback indicator': { field: 'callback_indicator', confidence: 0.99, reason: 'Explicit callback field.' },
  'rework indicator': { field: 'callback_indicator', confidence: 0.96, reason: 'Rework indicator; owner review remains required.' },
  'due date': { field: 'due_date', confidence: 0.99, reason: 'Exact due date label.' },
  'amount paid': { field: 'amount_paid', confidence: 0.98, reason: 'Exact paid amount label.' },
  'payment amount': { field: 'payment_amount', confidence: 0.98, reason: 'Exact payment amount label.' },
  quantity: { field: 'quantity', confidence: 0.94, reason: 'Quantity field.' },
  'unit cost': { field: 'unit_cost', confidence: 0.97, reason: 'Unit cost label.' },
  description: { field: 'description', confidence: 0.94, reason: 'Description label; preserved as supplied.' },
  'transaction id': { field: 'transaction_id', confidence: 0.99, reason: 'Exact stable transaction identifier.' },
};

const rules: Array<[DatasetType, string[]]> = [
  ['profit_and_loss', ['profit and loss', 'income statement', 'p&l', 'net income', 'gross profit']],
  ['balance_sheet', ['balance sheet', 'accounts receivable', 'accounts payable', 'assets', 'liabilities']],
  ['general_ledger', ['general ledger', 'journal', 'debit', 'credit', 'account']],
  ['invoices', ['invoice', 'invoice #', 'invoice number', 'due date']],
  ['payments', ['payment', 'paid date', 'payment method']],
  ['bills', ['bill #', 'bill number', 'vendor bill']],
  ['payroll', ['payroll', 'gross wages', 'overtime', 'employer tax']],
  ['time_entries', ['time entry', 'labor hours', 'regular hours', 'overtime hours']],
  ['callbacks', ['callback', 'rework', 'return visit']],
  ['jobs', ['job id', 'job number', 'work order', 'job revenue']],
  ['estimates', ['estimate', 'quoted amount', 'estimate status']],
  ['vendors', ['vendor', 'supplier']],
  ['customers', ['customer', 'client']],
  ['materials', ['material cost', 'item cost', 'materials']],
  ['inventory', ['inventory', 'quantity on hand', 'stock']],
  ['marketing', ['marketing spend', 'ad spend', 'campaign']],
  ['lead_sources', ['lead source', 'marketing source']],
  ['technicians', ['technician', 'tech']],
  ['transactions', ['transaction id', 'transaction date', 'debit', 'credit']],
  ['expenses', ['expense', 'vendor', 'amount']],
];

export function classifyFile(fileName: string, headers: string[]): DatasetType {
  // POS / source profiles first (Toast today; Square/Clover later)
  const profileType = classifyWithProfiles(fileName, headers);
  if (profileType) return profileType;

  const name = normalize(fileName);
  const text = normalize(fileName + ' ' + headers.join(' '));
  if (/(^| )(completed )?jobs?( |$)|work orders?/.test(name)) return 'jobs';
  if (/(^| )payroll( |$)/.test(name)) return 'payroll';
  if (/profit and loss|income statement|(^| )p l( |$)/.test(name)) return 'profit_and_loss';
  for (const [type, needles] of rules) {
    if (needles.some((n) => text.includes(normalize(n)))) return type;
  }
  return 'generic';
}

/**
 * Suggest column mappings.
 * fileName is optional for backward compatibility; pass it so POS profiles (Toast) can auto-confirm.
 */
export function suggestMappings(
  headers: string[],
  dataset: DatasetType,
  fileName = ''
): ColumnMapping[] {
  return headers.map((sourceColumn) => {
    // 1) Source profile (Toast, future Square/Clover) wins when detected
    const profileHit = mapWithProfiles(sourceColumn, dataset, fileName, headers);
    if (profileHit) return profileHit;

    // 2) Generic aliases
    const key = normalize(sourceColumn);
    const exact = aliases[key];
    if (exact)
      return {
        ...exact,
        sourceColumn,
        targetField: exact.field,
        confirmed: exact.confidence >= 0.85,
      };

    // 3) Light dataset context
    const context =
      dataset === 'jobs' && key === 'total'
        ? {
            field: 'revenue',
            confidence: 0.58,
            reason: 'Possible job revenue based on file type; requires confirmation.',
          }
        : undefined;

    return context
      ? {
          sourceColumn,
          targetField: context.field,
          confidence: context.confidence,
          reason: context.reason,
          confirmed: false,
        }
      : {
          sourceColumn,
          targetField: 'ignore',
          confidence: 1,
          reason: 'No deterministic mapping found.',
          confirmed: true,
        };
  });
}

function cellString(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object' && 'text' in value && typeof (value as { text: unknown }).text === 'string')
    return (value as { text: string }).text;
  throw new Error(
    'Unsupported spreadsheet cell content; formula, hyperlink, or rich embedded content is not accepted.'
  );
}

export function parseCsv(content: string, fileName = ''): ParsedSheet[] {
  if (content.includes('\0')) throw new Error('CSV contains binary or malformed content.');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quoted) {
      if (c === '"' && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      if (cell) throw new Error('Malformed CSV quoting.');
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && content[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
      if (rows.length > MAX_ROWS + 1) throw new Error('CSV row limit exceeded.');
    } else cell += c;
    if (cell.length > 100000) throw new Error('CSV cell exceeds the size limit.');
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.');
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  if (rows.length < 2 || rows.length > MAX_ROWS + 1)
    throw new Error('CSV needs a header and 1–10,000 data rows.');
  const headers = rows[0].map((x, i) => String(x).trim() || `Column ${i + 1}`);
  if (headers.length > MAX_COLUMNS || new Set(headers).size !== headers.length)
    throw new Error('CSV has too many columns or duplicate header names.');
  const data = rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
  const classification = classifyFile(fileName, headers);
  return [
    {
      name: 'CSV',
      headers,
      rows: data,
      classification,
      mappings: suggestMappings(headers, classification, fileName),
      dateRange: findDateRange(data),
    },
  ];
}

function validateXlsxArchive(buffer: Buffer) {
  if (buffer.length < 22 || buffer[0] !== 0x50 || buffer[1] !== 0x4b)
    throw new Error('The .xlsx ZIP signature is invalid.');
  const min = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= min; i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error('Malformed spreadsheet ZIP directory.');
  const count = buffer.readUInt16LE(eocd + 10),
    size = buffer.readUInt32LE(eocd + 12),
    offset = buffer.readUInt32LE(eocd + 16);
  if (count > 250 || size > 1_000_000 || offset + size > eocd)
    throw new Error('Spreadsheet archive structure exceeds safety limits.');
  let at = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== 0x02014b50)
      throw new Error('Malformed spreadsheet ZIP entry.');
    const compressed = buffer.readUInt32LE(at + 20),
      uncompressed = buffer.readUInt32LE(at + 24),
      nl = buffer.readUInt16LE(at + 28),
      el = buffer.readUInt16LE(at + 30),
      cl = buffer.readUInt16LE(at + 32),
      name = buffer.toString('utf8', at + 46, at + 46 + nl).toLowerCase();
    if (
      /(^|\\)(\.\.|vbaProject\.bin|externallinks|embeddings)(\\|\/|$)/.test(name) ||
      name.includes('vbaproject') ||
      name.includes('externallinks')
    )
      throw new Error('Macros, external links and embedded content are not accepted.');
    if (
      uncompressed > 20_000_000 ||
      (compressed === 0 && uncompressed > 0) ||
      (compressed > 0 && uncompressed / compressed > 100)
    )
      throw new Error('Spreadsheet expansion ratio or entry size exceeds the safe limit.');
    total += uncompressed;
    if (total > 50_000_000) throw new Error('Spreadsheet uncompressed size exceeds 50 MB.');
    at += 46 + nl + el + cl;
  }
  if (at > offset + size) throw new Error('Malformed spreadsheet ZIP directory.');
}

export async function parseXlsx(buffer: Buffer, fileName: string): Promise<ParsedSheet[]> {
  validateXlsxArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheets: ParsedSheet[] = [];
  for (const ws of workbook.worksheets) {
    if (ws.rowCount > MAX_ROWS + 1 || ws.columnCount > MAX_COLUMNS)
      throw new Error('Spreadsheet exceeds row or column limits.');
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cellString(cell.value) ?? '').trim() || `Column ${col}`;
    });
    if (!headers.length || new Set(headers).size !== headers.length) continue;
    const rows: Array<Record<string, string | number | boolean | null>> = [];
    for (let n = 2; n <= ws.rowCount; n++) {
      const source = ws.getRow(n),
        values: Record<string, string | number | boolean | null> = {};
      let nonempty = false;
      for (let col = 1; col <= headers.length; col++) {
        const cell = source.getCell(col);
        if (
          cell.type === ExcelJS.ValueType.Formula ||
          (cell.type === ExcelJS.ValueType.SharedString &&
            typeof cell.value === 'object' &&
            cell.value !== null &&
            'formula' in cell.value)
        )
          throw new Error(`Formula cells are not accepted (${ws.name}, row ${n}).`);
        const value = cellString(cell.value);
        values[headers[col - 1]] = value;
        if (value !== null && value !== '') nonempty = true;
      }
      if (nonempty) rows.push(values);
      if (rows.length > MAX_ROWS) throw new Error('Spreadsheet row limit exceeded.');
    }
    const sheetLabel = fileName + ' ' + ws.name;
    const classification = classifyFile(sheetLabel, headers);
    sheets.push({
      name: ws.name,
      headers,
      rows,
      classification,
      mappings: suggestMappings(headers, classification, sheetLabel),
      dateRange: findDateRange(rows),
    });
  }
  if (!sheets.length) throw new Error('No worksheet with a unique header row was found.');
  return sheets;
}

export function findDateRange(rows: Array<Record<string, string | number | boolean | null>>) {
  const key = Object.keys(rows[0] || {}).find((k) =>
    ['date', 'transaction date', 'job date', 'completed date', 'invoice date', 'paid date', 'business date', 'opened'].includes(
      normalize(k)
    )
  );
  if (!key) return null;
  const dates = rows
    .map((r) => parseDate(r[key]))
    .filter((x): x is string => !!x)
    .sort();
  return dates.length ? { start: dates[0], end: dates.at(-1)! } : null;
}

export function parseDate(v: unknown): string | null {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s)
    return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
  return d.getUTCFullYear() === Number(m[3]) && d.getUTCMonth() === Number(m[1]) - 1 && d.getUTCDate() === Number(m[2])
    ? d.toISOString().slice(0, 10)
    : null;
}

export function parseMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  if (!s || /[=+@]/.test(s[0])) return null;
  const neg = /^\(.*\)$/.test(s);
  if (neg) s = s.slice(1, -1);
  s = s.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s) * (neg ? -1 : 1);
  return Number.isSafeInteger(Math.round(n * 100)) ? Math.round(n * 100) : null;
}

export function digestRows(rows: unknown) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
export function newUploadId() {
  return randomUUID();
}
export function metricForField(field: string, dataset: DatasetType): Metric | null {
  if (field === 'revenue') return dataset === 'jobs' ? 'job_revenue' : 'revenue';
  if (field === 'amount')
    return dataset === 'payments'
      ? 'invoice_paid'
      : dataset === 'invoices'
        ? 'invoice_contract'
        : dataset === 'vendors' || dataset === 'expenses' || dataset === 'bills'
          ? 'vendor_spend'
          : dataset === 'marketing'
            ? 'marketing_cost'
            : 'revenue';
  if (field === 'expense') return 'expenses';
  if (field === 'material_cost') return 'job_materials';
  if (field === 'labor_cost') return 'job_labor';
  if (field === 'marketing_spend') return 'marketing_cost';
  if (field === 'overtime_hours') return 'overtime_hours';
  return null;
}
