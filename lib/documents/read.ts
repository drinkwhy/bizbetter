import path from 'path';
import type { CellValue, DocFormat } from './types';
import { parseDelimited } from './parse';

const IMAGE_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/** Detects the real format from magic bytes first, then the extension. */
export function sniffFormat(buf: Buffer, fileName: string): { format: DocFormat; mime?: string } {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const head = buf.subarray(0, 8);
  if (head.subarray(0, 4).toString('latin1') === '%PDF') return { format: 'pdf', mime: 'application/pdf' };
  if (head[0] === 0x89 && head.subarray(1, 4).toString('latin1') === 'PNG') return { format: 'image', mime: 'image/png' };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { format: 'image', mime: 'image/jpeg' };
  if (head.subarray(0, 4).toString('latin1') === 'GIF8') return { format: 'image', mime: 'image/gif' };
  if (head.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { format: 'image', mime: 'image/webp' };
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) return { format: 'xls', mime: 'application/vnd.ms-excel' };
  if (head[0] === 0x50 && head[1] === 0x4b) {
    const probe = buf.toString('latin1');
    if (probe.includes('word/document.xml')) return { format: 'docx' };
    if (probe.includes('xl/workbook') || ext === 'xlsx' || ext === 'xlsm') return { format: 'xlsx' };
    return { format: 'other', mime: 'application/zip' };
  }
  if (buf.includes(0)) return { format: 'other' };
  const text = buf.subarray(0, 4000).toString('utf8').trimStart();
  if (/^OFXHEADER|<OFX>/i.test(text) || ['ofx', 'qbo', 'qfx'].includes(ext)) return { format: 'ofx' };
  if (ext === 'json' || /^[[{]/.test(text)) { try { JSON.parse(buf.toString('utf8')); return { format: 'json' }; } catch { /* fall through */ } }
  if (['csv', 'tsv'].includes(ext)) return { format: 'csv' };
  if (IMAGE_MIME[ext]) return { format: 'other' };
  return { format: 'txt' };
}

export async function readSpreadsheet(buf: Buffer): Promise<Array<{ sheet: string; grid: CellValue[][] }>> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellFormula: false, cellHTML: false, dense: true });
  return wb.SheetNames.slice(0, 20).map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false }).slice(0, 20000);
    return { sheet: name, grid: rows.map((r) => (r as unknown[]).slice(0, 128).map((c): CellValue => (c instanceof Date ? c.toISOString().slice(0, 10) : typeof c === 'number' || typeof c === 'string' ? c : c === null || c === undefined ? null : String(c)))) };
  });
}

export function readCsv(buf: Buffer): CellValue[][] {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf).replace(/^\uFEFF/, '');
  return parseDelimited(text).slice(0, 20000);
}

/** Extracts PDF text as lines per page, rebuilding lines from glyph positions and keeping column gaps. */
export async function readPdf(buf: Buffer): Promise<string[][]> {
  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const pages: string[][] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
    const page = await pdf.getPage(p); const content = await page.getTextContent();
    const items = (content.items as Array<{ str?: string; transform?: number[]; width?: number }>).filter((i) => typeof i.str === 'string' && i.transform);
    const lines: Array<{ y: number; parts: Array<{ x: number; end: number; s: string }> }> = [];
    for (const it of items) {
      const x = it.transform![4], y = it.transform![5]; if (!it.str!.trim()) continue;
      let line = lines.find((l) => Math.abs(l.y - y) <= 2.5); if (!line) { line = { y, parts: [] }; lines.push(line); }
      line.parts.push({ x, end: x + (it.width || 0), s: it.str! });
    }
    lines.sort((a, b) => b.y - a.y);
    pages.push(lines.map((l) => { l.parts.sort((a, b) => a.x - b.x); let out = '', last = -1; for (const part of l.parts) { out += last < 0 ? part.s : (part.x - last > 6 ? '  ' : part.x - last > 1 ? ' ' : '') + part.s; last = part.end; } return out.trim(); }));
  }
  return pages;
}

export async function readDocx(buf: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const r = await mammoth.extractRawText({ buffer: buf });
  return r.value;
}

export function readOfx(text: string): { card: boolean; rows: Array<{ date: string | null; amount: string | null; name: string | null; memo: string | null; id: string | null; line: number }> } {
  const tag = (block: string, t: string) => { const m = block.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i')); return m ? m[1].trim() : null; };
  const rows: ReturnType<typeof readOfx>['rows'] = [];
  const re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { const b = m[1]; const raw = tag(b, 'DTPOSTED'); rows.push({ date: raw ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : null, amount: tag(b, 'TRNAMT'), name: tag(b, 'NAME'), memo: tag(b, 'MEMO'), id: tag(b, 'FITID'), line: text.slice(0, m.index).split('\n').length }); }
  return { card: /<CCSTMTRS>/i.test(text), rows };
}
