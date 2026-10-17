/**
 * Runs files through the document detector and prints what BizBetter would classify them as.
 * Usage: npx tsx scripts/detect-documents.ts [--ai] <file-or-folder>...
 * Deterministic only unless --ai is passed (then Grok may be called for low-confidence files).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { extractDocument } from '@/lib/documents/extract';

async function expand(p: string): Promise<string[]> {
  const st = await fs.stat(p); if (!st.isDirectory()) return [p];
  const out: string[] = []; for (const n of (await fs.readdir(p)).sort()) out.push(...(await expand(path.join(p, n)))); return out;
}

async function main() {
  const args = process.argv.slice(2); const useAi = args.includes('--ai'); const files = (await Promise.all(args.filter((a) => a !== '--ai').map(expand))).flat();
  for (const f of files) {
    const buf = await fs.readFile(f);
    const doc = await extractDocument({ id: '00000000-0000-4000-8000-000000000000', businessId: 'detect', fileName: path.basename(f), storedAs: 'x', buf }, useAi ? {} : { aiCall: null });
    const dated = doc.rows.filter((r) => r.values.date !== undefined).length;
    console.log(`${path.basename(f)}\n  kind=${doc.kind} conf=${doc.kindConfidence} method=${doc.method} status=${doc.status} rows=${doc.rows.length} dated=${dated}\n  reason: ${doc.kindReason.slice(0, 220)}${doc.warnings.length ? '\n  warnings: ' + doc.warnings.join(' | ').slice(0, 300) : ''}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
