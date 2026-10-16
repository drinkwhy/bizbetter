import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { assertLocal } from '@/lib/evidence/access';
import { listBusinesses } from '@/lib/evidence/repository';
import { extractDocument, MAX_DOCUMENT_BYTES } from '@/lib/documents/extract';
import { discardDocument, listDocuments, saveDocument, saveOriginal } from '@/lib/documents/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function business(id: unknown) {
  const list = await listBusinesses(); const b = list.find((x) => x.id === id);
  if (!b) throw new Error('Select a known business workspace.'); return b.id;
}

export async function GET(req: NextRequest) {
  try { assertLocal(req); const id = await business(req.nextUrl.searchParams.get('businessId')); return NextResponse.json({ documents: await listDocuments(id) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to list documents.' }, { status: 400 }); }
}

export async function POST(req: NextRequest) {
  try {
    assertLocal(req, true);
    if (Number(req.headers.get('content-length') || 0) > 80 * 1024 * 1024) throw new Error('Upload batch exceeds 80 MB.');
    const form = await req.formData(); const businessId = await business(String(form.get('businessId') || ''));
    const files = form.getAll('files').filter((v): v is File => v instanceof File);
    if (!files.length || files.length > 20) throw new Error('Upload between 1 and 20 files at a time.');
    const results = [];
    for (const file of files) {
      const id = randomUUID(); const fileName = path.basename(file.name).replace(/[\x00-\x1f]/g, '').slice(0, 200) || 'file';
      if (file.size > MAX_DOCUMENT_BYTES) { results.push({ id, fileName, status: 'ERROR', warnings: ['File exceeds the 10 MB per-file limit.'] }); continue; }
      const buf = Buffer.from(await file.arrayBuffer());
      const storedAs = await saveOriginal(businessId, id, fileName, buf);
      const doc = await extractDocument({ id, businessId, fileName, storedAs, buf });
      await saveDocument(doc); results.push(doc);
    }
    return NextResponse.json({ documents: results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed safely.' }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  try { assertLocal(req, true); const id = await business(req.nextUrl.searchParams.get('businessId')); const doc = req.nextUrl.searchParams.get('documentId') || ''; await discardDocument(id, doc); return NextResponse.json({ success: true }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to discard document.' }, { status: 400 }); }
}
