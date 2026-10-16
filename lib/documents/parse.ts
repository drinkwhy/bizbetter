import type { CellValue } from './types';

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const pad = (n: number) => String(n).padStart(2, '0');
const valid = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };

/** Parses a month header such as "Oct 2025", "October 2025", "Oct-25", "2025-10" or "10/2025" to YYYY-MM. */
export function parseMonth(v: CellValue): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase().replace(/\./g, '');
  let m = s.match(/^([a-z]{3,9})[\s\-']+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[1]]) { const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]); return `${y}-${pad(MONTHS[m[1]])}`; }
  m = s.match(/^(\d{4})-(\d{1,2})$/); if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(+m[2])}`;
  m = s.match(/^(\d{1,2})\/(\d{4})$/); if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${pad(+m[1])}`;
  return null;
}

/** Parses a date cell to YYYY-MM-DD. Month-only values resolve to the first of the month. Never guesses a missing year unless `year` is given. */
export function parseAnyDate(v: CellValue, year?: number): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') { if (v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10); return null; }
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/); if (m && valid(+m[1], +m[2], +m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; if (valid(y, +m[1], +m[2])) return `${y}-${pad(+m[1])}-${pad(+m[2])}`; return null; }
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/); if (m && year && valid(year, +m[1], +m[2])) return `${year}-${pad(+m[1])}-${pad(+m[2])}`;
  m = s.toLowerCase().match(/^([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/); if (m && MONTHS[m[1]] && valid(+m[3], MONTHS[m[1]], +m[2])) return `${m[3]}-${pad(MONTHS[m[1]])}-${pad(+m[2])}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})/); if (m && valid(+m[1], +m[2], +m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  const month = parseMonth(s); if (month) return month + '-01';
  return null;
}

/** Money cell to integer cents. Rejects spreadsheet formulas, more than 2 decimals and non-numeric text. */
export function parseMoneyMinor(v: CellValue): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') { if (!Number.isFinite(v)) return null; const c = Math.round(v * 100); return Math.abs(c - v * 100) < 1e-6 && Number.isSafeInteger(c) ? c : null; }
  let s = v.trim(); if (!s || /^[=+@]/.test(s)) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  if (/^-/.test(s)) { neg = !neg; s = s.slice(1).trim(); }
  if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1).trim(); }
  s = s.replace(/^(usd|us\$|\$)\s*/i, '').replace(/\s*(usd|cr|dr)$/i, (x) => { if (/dr/i.test(x)) neg = !neg; return ''; });
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  s = s.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ''] = s.split('.'); const c = Number(w) * 100 + Number((f + '00').slice(0, 2));
  return Number.isSafeInteger(c) ? (neg ? -c : c) : null;
}

export function parseNumber(v: CellValue): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = v.trim().replace(/,/g, ''); if (!/^-?\d+(\.\d+)?$/.test(s)) return null; return Number(s);
}

/** Minimal RFC-4180 CSV/TSV parser into a grid. */
export function parseDelimited(text: string, delimiter?: string): CellValue[][] {
  const first = text.split(/\r?\n/, 1)[0] || '';
  const d = delimiter || (first.split('\t').length > first.split(',').length ? '\t' : first.split('|').length > first.split(',').length + 1 ? '|' : ',');
  const rows: CellValue[][] = []; let row: CellValue[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; continue; }
    if (c === '"' && cell.trim() === '') { quoted = true; cell = ''; }
    else if (c === d) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== '' && x !== null)).map((r) => r.map((x) => (x === '' ? null : x)));
}

/** Collapses whitespace and case for literal "does this value appear in the source text" checks. */
export const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
/** True when a money/number string's digits appear literally in the source text (ignoring $ and thousands separators). */
export function appearsInText(value: string, text: string): boolean {
  const digits = (x: string) => x.replace(/[$,\s()+-]/g, '').toLowerCase();
  const v = digits(value); if (!v) return false;
  const tokens = (text.match(/[$(]?-?[\d,]+(?:\.\d+)?\)?/g) || []).map(digits);
  return tokens.some((t) => t === v || (t.includes('.') && !v.includes('.') && t === v + '.00') || (v.includes('.') && !t.includes('.') && v === t + '.00') || Number(t) === Number(v));
}
