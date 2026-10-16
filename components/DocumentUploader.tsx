'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtractedDocument, DocKind } from '@/lib/documents/types';
import { DOC_KINDS, DOC_KIND_IDS } from '@/lib/documents/types';

const METHOD: Record<string, string> = { DETERMINISTIC: 'Read directly', GROK_CLASSIFIED: 'Type detected by Grok', GROK_EXTRACTED: 'Rows extracted by Grok (verified against the text)', GROK_VISION: 'Read by Grok vision (confirm values)', NONE: 'Not read' };
const STATUS: Record<string, string> = { READY: 'bg-emerald-500/20 text-emerald-300', NEEDS_REVIEW: 'bg-amber-500/20 text-amber-300', CONTEXT_ONLY: 'bg-sky-500/20 text-sky-300', UNSUPPORTED: 'bg-slate-700 text-slate-300', ERROR: 'bg-red-500/20 text-red-300', COMMITTED: 'bg-emerald-700/40 text-emerald-200' };
const STATUS_LABEL: Record<string, string> = { READY: 'Ready to import', NEEDS_REVIEW: 'Review needed', CONTEXT_ONLY: 'Context only', UNSUPPORTED: 'Stored, not readable', ERROR: 'Could not read', COMMITTED: 'Imported' };
const SHOW = ['date', 'line', 'section', 'description', 'vendor', 'invoice_id', 'customer', 'job_id', 'job_type', 'employee', 'amount', 'amount_paid', 'due_date', 'revenue', 'labor_cost', 'material_cost', 'regular_hours', 'overtime_hours', 'gross_wages', 'overtime_pay', 'gross', 'fee', 'net', 'balance'];

export function DocumentUploader({ businessId, onChange }: { businessId: string; onChange: () => void }) {
  const [docs, setDocs] = useState<ExtractedDocument[]>([]); const [busy, setBusy] = useState(''); const [drag, setDrag] = useState(false); const [msg, setMsg] = useState('');
  const [edits, setEdits] = useState<Record<string, { kind?: DocKind; excluded: number[]; confirm: boolean; open: boolean }>>({}); const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => { if (!businessId) return; const r = await fetch('/api/documents?businessId=' + encodeURIComponent(businessId), { cache: 'no-store' }); const d = await r.json(); if (r.ok) setDocs(d.documents || []); }, [businessId]);
  useEffect(() => { load().catch(() => setMsg('Unable to load documents.')); }, [load]);
  const ed = (id: string) => edits[id] || { excluded: [], confirm: false, open: false };
  const setEd = (id: string, v: Partial<ReturnType<typeof ed>>) => setEdits((e) => ({ ...e, [id]: { ...ed(id), ...v } }));

  async function upload(list: FileList | File[]) {
    const files = Array.from(list); if (!files.length || !businessId) return; setBusy(`Reading ${files.length} file(s)... Grok is used for files that cannot be read directly, which can take a minute.`); setMsg('');
    try { for (let i = 0; i < files.length; i += 5) { const form = new FormData(); form.set('businessId', businessId); files.slice(i, i + 5).forEach((f) => form.append('files', f)); const r = await fetch('/api/documents', { method: 'POST', body: form }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Upload failed.'); }
      await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Upload failed.'); } finally { setBusy(''); }
  }
  async function commit(doc: ExtractedDocument) {
    const e = ed(doc.id); const r = await fetch('/api/documents/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, documentId: doc.id, kind: e.kind || doc.kind, excludedRows: e.excluded, complete: true, confirmAiRead: e.confirm }) });
    const d = await r.json(); if (!r.ok) throw new Error(`${doc.fileName}: ${d.error}`); return d;
  }
  async function commitOne(doc: ExtractedDocument) { setBusy('Importing ' + doc.fileName); setMsg(''); try { await commit(doc); await load(); onChange(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Import failed.'); } finally { setBusy(''); } }
  async function commitAll() { setBusy('Importing all ready files...'); setMsg(''); const errors: string[] = []; for (const d of docs.filter((x) => x.status === 'READY' || x.status === 'CONTEXT_ONLY')) { try { await commit(d); } catch (e) { errors.push(e instanceof Error ? e.message : 'failed'); } } await load(); onChange(); setMsg(errors.join(' ')); setBusy(''); }
  async function discard(doc: ExtractedDocument) { await fetch(`/api/documents?businessId=${encodeURIComponent(businessId)}&documentId=${doc.id}`, { method: 'DELETE' }); await load(); }
  const pending = docs.filter((d) => d.status === 'READY' || d.status === 'CONTEXT_ONLY').length;

  return (
    <section className="rounded-xl border border-slate-700 p-4 space-y-3" aria-label="Upload documents">
      <div className="flex flex-wrap justify-between gap-2 items-baseline"><h2 className="text-lg font-semibold">2. Upload all your documents</h2>
        {pending > 0 && <button onClick={commitAll} disabled={!!busy} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Confirm & import all ready files ({pending})</button>}</div>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') input.current?.click(); }}
        className={'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center ' + (drag ? 'border-sky-400 bg-sky-500/10' : 'border-slate-600 hover:border-slate-400')}>
        <p className="font-semibold">Drop files here or click to choose</p>
        <p className="text-sm text-slate-400 mt-1">Any file type: P&L, bank and card statements, invoices / A/R, job costing, payroll, processor reports, receipts, notes. CSV, Excel (XLSX/XLS), PDF, Word, TXT, JSON, OFX/QBO and images.</p>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
      </div>
      {busy && <p className="text-sm text-sky-300">{busy}</p>}{msg && <p className="text-sm text-amber-300">{msg}</p>}
      <ul className="space-y-2">
        {docs.map((doc) => { const e = ed(doc.id); const kind = e.kind || doc.kind; const cols = SHOW.filter((c) => doc.rows.some((r) => r.values[c as keyof typeof r.values] !== undefined)).slice(0, 8);
          const editable = doc.status !== 'COMMITTED' && doc.status !== 'UNSUPPORTED' && doc.status !== 'ERROR'; const ai = doc.method === 'GROK_VISION' || doc.method === 'GROK_EXTRACTED';
          return (
          <li key={doc.id} className="rounded-lg border border-slate-700 p-3 text-sm space-y-2" data-testid="document-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold break-all">{doc.fileName}</p><p className="text-xs text-slate-400">{doc.format.toUpperCase()} · {METHOD[doc.method]} · {doc.rows.length} row(s){doc.recordsCreated !== undefined ? ` · ${doc.recordsCreated} evidence records` : ''}</p></div>
              <span className={'text-xs rounded px-2 py-0.5 ' + (STATUS[doc.status] || '')}>{STATUS_LABEL[doc.status] || doc.status}</span></div>
            <div className="flex flex-wrap items-center gap-2"><label className="text-xs text-slate-400">Detected type</label>
              {editable ? <select value={kind} onChange={(x) => setEd(doc.id, { kind: x.target.value as DocKind })} className="rounded bg-slate-900 border border-slate-600 p-1 text-sm">{DOC_KIND_IDS.map((k) => <option key={k} value={k}>{DOC_KINDS[k].label}</option>)}</select>
                : <span className="font-medium">{DOC_KINDS[kind].label}</span>}
              <span className="text-xs text-slate-500">({Math.round(doc.kindConfidence * 100)}% confidence)</span></div>
            <p className="text-xs text-slate-500">{doc.kindReason}</p>
            {doc.warnings.length > 0 && <ul className="list-disc pl-5 text-xs text-amber-300">{doc.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            {doc.textExcerpt && doc.status === 'CONTEXT_ONLY' && <p className="text-xs text-slate-400 whitespace-pre-line line-clamp-4">{doc.textExcerpt.slice(0, 400)}</p>}
            {doc.rows.length > 0 && <div><button className="text-xs underline text-sky-300" onClick={() => setEd(doc.id, { open: !e.open })}>{e.open ? 'Hide rows' : `Review rows (${doc.rows.length})`}</button>
              {e.open && <div className="mt-2 max-h-72 overflow-auto"><table className="text-xs w-full"><thead><tr className="text-left text-slate-400">{editable && <th>Use</th>}<th>Source</th>{cols.map((c) => <th key={c} className="px-1">{c.replace('_', ' ')}</th>)}</tr></thead>
                <tbody>{doc.rows.slice(0, 300).map((r) => <tr key={r.index} className={e.excluded.includes(r.index) ? 'opacity-40' : ''}>{editable && <td><input type="checkbox" checked={!e.excluded.includes(r.index)} onChange={(x) => setEd(doc.id, { excluded: x.target.checked ? e.excluded.filter((i) => i !== r.index) : [...e.excluded, r.index] })} /></td>}
                  <td className="text-slate-500 pr-1">{r.loc}</td>{cols.map((c) => <td key={c} className="px-1">{String(r.values[c as keyof typeof r.values] ?? '')}</td>)}</tr>)}</tbody></table></div>}</div>}
            {editable && <div className="flex flex-wrap items-center gap-3">
              {ai && <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={e.confirm} onChange={(x) => setEd(doc.id, { confirm: x.target.checked })} />I checked these AI-read values against the file</label>}
              <button onClick={() => commitOne(doc)} disabled={!!busy || (ai && !e.confirm)} className="rounded bg-sky-600 px-3 py-1 disabled:opacity-50">{DOC_KINDS[kind].carriesRecords ? 'Confirm & import' : 'Keep as context'}</button>
              <button onClick={() => discard(doc)} className="text-xs text-slate-400 underline">Discard</button></div>}
          </li>); })}
      </ul>
    </section>);
}
