import { dataDir } from '@/lib/paths';
import { promises as fs } from 'fs';
import path from 'path';
import type { ExtractedDocument } from './types';

const root = () => dataDir('documents');
const safeId = (s: string) => { if (!/^[-a-zA-Z0-9_]{1,80}$/.test(s)) throw new Error('Invalid identifier.'); return s; };
const safeName = (s: string) => path.basename(s).replace(/[^\w.\- ()&]+/g, '_').slice(0, 120) || 'file';

/** Stores the original bytes so every finding can be traced to the file the owner supplied. */
export async function saveOriginal(businessId: string, id: string, fileName: string, buf: Buffer) {
  const dir = path.join(root(), safeId(businessId)); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const storedAs = `${safeId(id)}-${safeName(fileName)}`; await fs.writeFile(path.join(dir, storedAs), buf, { mode: 0o600, flag: 'wx' }); return storedAs;
}
export async function saveDocument(doc: ExtractedDocument) {
  const dir = path.join(root(), safeId(doc.businessId)); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = path.join(dir, `${safeId(doc.id)}.json.tmp`); await fs.writeFile(tmp, JSON.stringify(doc), { mode: 0o600 }); await fs.rename(tmp, path.join(dir, `${doc.id}.json`));
}
export async function loadDocument(businessId: string, id: string): Promise<ExtractedDocument> {
  const doc = JSON.parse(await fs.readFile(path.join(root(), safeId(businessId), `${safeId(id)}.json`), 'utf8')) as ExtractedDocument;
  if (doc.businessId !== businessId || doc.id !== id) throw new Error('Document does not belong to this workspace.'); return doc;
}
export async function listDocuments(businessId: string): Promise<ExtractedDocument[]> {
  const dir = path.join(root(), safeId(businessId)); let names: string[] = [];
  try { names = await fs.readdir(dir); } catch { return []; }
  const docs = await Promise.all(names.filter((n) => n.endsWith('.json')).map(async (n) => { try { return JSON.parse(await fs.readFile(path.join(dir, n), 'utf8')) as ExtractedDocument; } catch { return null; } }));
  return docs.filter((d): d is ExtractedDocument => !!d && d.status !== 'DISCARDED').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function discardDocument(businessId: string, id: string) {
  const doc = await loadDocument(businessId, id); if (doc.status === 'COMMITTED') throw new Error('Committed documents are removed through Data Intake > imports.');
  await fs.rm(path.join(root(), safeId(businessId), doc.storedAs), { force: true }); await fs.rm(path.join(root(), safeId(businessId), `${id}.json`), { force: true });
}
