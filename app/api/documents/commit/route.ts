import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertLocal } from '@/lib/evidence/access';
import { commitIntake, intakeWorkspace, listBusinesses } from '@/lib/evidence/repository';
import { documentToEvidence } from '@/lib/documents/records';
import { loadDocument, saveDocument } from '@/lib/documents/store';
import { DOC_KINDS, DOC_KIND_IDS, type DocKind } from '@/lib/documents/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    assertLocal(req, true);
    if (Number(req.headers.get('content-length') || 0) > 200_000) throw new Error('Request too large.');
    const body = await req.json() as { businessId?: string; documentId?: string; kind?: DocKind; excludedRows?: number[]; complete?: boolean; confirmAiRead?: boolean };
    const businessId = String(body.businessId || ''); if (!(await listBusinesses()).some((b) => b.id === businessId)) throw new Error('Select a known business workspace.');
    const doc = await loadDocument(businessId, String(body.documentId || ''));
    if (doc.status === 'COMMITTED') throw new Error('This document is already imported.');
    if (doc.status === 'ERROR' || doc.status === 'UNSUPPORTED') throw new Error('This file could not be read, so there is nothing to import. It stays stored with the workspace.');
    const kind = body.kind && DOC_KIND_IDS.includes(body.kind) ? body.kind : doc.kind;
    if (!DOC_KINDS[kind].carriesRecords) { doc.kind = kind; doc.status = 'COMMITTED'; doc.committedAt = new Date().toISOString(); doc.recordsCreated = 0; await saveDocument(doc); return NextResponse.json({ document: doc, records: 0, note: 'Kept as business context; no financial records created.' }); }
    if ((doc.method === 'GROK_VISION' || doc.method === 'GROK_EXTRACTED') && body.confirmAiRead !== true) throw new Error('These values were read by AI. Review them and confirm before importing.');
    const excluded = Array.isArray(body.excludedRows) ? body.excludedRows.filter((n) => Number.isInteger(n)).slice(0, 20000) : [];
    const ws = await intakeWorkspace(businessId);
    if (ws.imports.some((i) => i.status === 'COMMITTED' && i.sourceDigest === doc.sha256)) throw new Error('An identical file was already imported into this workspace.');
    const importId = randomUUID();
    const result = documentToEvidence(doc, { businessId, importId, kind, excludedRows: excluded, complete: body.complete !== false });
    if (!result.records.length) throw new Error('No dated amounts could be created from this file. Check the detected type and rows.');
    await commitIntake({ batch: result.batch, normalized: result.normalized, records: result.records });
    Object.assign(doc, { kind, status: 'COMMITTED', importId, committedAt: new Date().toISOString(), recordsCreated: result.records.length });
    await saveDocument(doc);
    return NextResponse.json({ document: doc, records: result.records.length, rows: result.normalized.length, warnings: result.warnings });
  } catch (e) { const missing = e instanceof Error && /ENOENT/.test(e.message); return NextResponse.json({ error: missing ? 'Unknown document for this workspace.' : e instanceof Error ? e.message : 'Import was not committed.' }, { status: missing ? 404 : 400 }); }
}
