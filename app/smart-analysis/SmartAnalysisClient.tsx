'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FindingCard, type Workspace } from '@/components/EvidenceWorkspace';
import { INSUFFICIENT, type Decision, type Finding, type LedgerItem, type SourceRecord } from '@/lib/evidence/model';
import { intakeHref, type GuidedStep, type GuidedStepId } from '@/lib/smart-analysis/steps';
import type { Sufficiency } from '@/lib/smart-analysis/sufficiency';
import type { Answer } from '@/lib/ai/gateway';

type Business = { id: string; name: string; industry?: string };
type Guide = { businesses: Business[]; businessId: string; business: Business; steps: GuidedStep[]; sufficiency: Sufficiency };
type Result = { status: 'NEED_MORE_DATA' | 'AI_ANALYSIS' | 'DETERMINISTIC_ONLY'; message: string; provider: string; model: string | null; error?: string;
  sufficiency: Sufficiency; findings: Finding[]; answer: Answer | null; records: SourceRecord[]; decisions: Decision[]; ledger: LedgerItem[]; generatedAt: string };

const badge: Record<string, string> = { PROVIDED: 'bg-emerald-500/20 text-emerald-300', PARTIAL: 'bg-amber-500/20 text-amber-300', MISSING: 'bg-slate-700 text-slate-300' };
const label: Record<string, string> = { PROVIDED: 'Provided', PARTIAL: 'Partly provided', MISSING: 'Missing' };

export function SmartAnalysisClient({ initialBusinessId, initialStep }: { initialBusinessId?: string; initialStep?: string }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [businessId, setBusinessId] = useState(initialBusinessId || '');
  const [open, setOpen] = useState<string>(initialStep || '');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ name: '', industry: '', mode: 'update' as 'update' | 'new' });

  const load = useCallback(async (id?: string) => {
    const r = await fetch('/api/smart-analysis' + (id ? '?businessId=' + encodeURIComponent(id) : ''), { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Unable to load guided intake.');
    setGuide(d); setBusinessId(d.businessId); setProfile((p) => ({ ...p, name: d.business?.name === 'My Business' ? '' : d.business?.name || '', industry: d.business?.industry || '' }));
    if (!initialStep) { const next = d.sufficiency.checklist.find((c: { status: string }) => c.status !== 'PROVIDED'); setOpen((o) => o || next?.id || ''); }
  }, [initialStep]);
  useEffect(() => { load(initialBusinessId).catch((e) => setError(e.message)); }, [load, initialBusinessId]);
  useEffect(() => { if (open) document.getElementById('step-' + open)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [open, guide]);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/intake/businesses', { method: profile.mode === 'new' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, name: profile.name, industry: profile.industry }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to create workspace.');
      setResult(null); setOpen(''); await load(d.business.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create workspace.'); } finally { setBusy(false); }
  }
  async function run() {
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await fetch('/api/smart-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Analysis unavailable.');
      setResult(d); setTimeout(() => document.getElementById('smart-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) { setError(err instanceof Error ? err.message : 'Analysis unavailable.'); } finally { setBusy(false); }
  }

  if (!guide) return <main className="p-6 text-slate-300">{error || 'Loading guided analysis...'}</main>;
  const s = guide.sufficiency;
  const workspace: Workspace | null = result ? { message: result.message, quality: { score: null, formula: '', criteria: {}, limitations: [] }, findings: result.findings, records: result.records,
    decisions: result.decisions, ledger: result.ledger, missing: result.sufficiency.needs.map((n) => n.message), audit: [] } : null;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Smart analysis</h1>
        <p className="text-slate-300">We will walk you through the financials we need, one item at a time. For each one you will see why it matters and how to send it. Then run the analysis to get plain-language findings, fixes and prevention steps.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label>Business <select value={businessId} onChange={(e) => { setResult(null); load(e.target.value).catch((x) => setError(x.message)); }} className="ml-1 rounded bg-slate-900 border border-slate-600 p-1">
            {guide.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <Link className="underline text-slate-400" href={'/data-intake?businessId=' + encodeURIComponent(businessId)}>Open full Data Intake</Link>
        </div>
      </header>

      <section aria-label="Checklist" className="rounded-xl border border-slate-700 p-4 space-y-3">
        <div className="flex justify-between text-sm"><span className="font-semibold">Your checklist</span><span>{s.progress.provided} of {s.progress.total} provided{s.progress.partial ? `, ${s.progress.partial} partly` : ''}</span></div>
        <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-500" style={{ width: s.progress.percent + '%' }} /></div>
        <ol className="grid sm:grid-cols-2 gap-2">
          {s.checklist.map((c, i) => (
            <li key={c.id}><button onClick={() => setOpen(c.id)} className="w-full text-left flex items-center justify-between rounded border border-slate-700 px-3 py-2 hover:bg-slate-800">
              <span>{i + 1}. {c.title}{c.required && <span className="text-xs text-amber-300"> (required)</span>}</span>
              <span className={'text-xs rounded px-2 py-0.5 ' + badge[c.status]}>{label[c.status]}</span></button></li>))}
        </ol>
      </section>

      {guide.steps.map((step, i) => {
        const c = s.checklist.find((x) => x.id === step.id)!;
        const expanded = open === step.id;
        return (
          <section key={step.id} id={'step-' + step.id} className={'rounded-xl border p-4 space-y-3 ' + (expanded ? 'border-sky-500' : 'border-slate-700')}>
            <button className="w-full flex justify-between items-center text-left" onClick={() => setOpen(expanded ? '' : step.id)}>
              <h2 className="text-lg font-semibold">Step {i + 1}: {step.title}</h2>
              <span className={'text-xs rounded px-2 py-0.5 ' + badge[c.status]}>{label[c.status]}</span></button>
            <p className="text-sm text-slate-400">{c.detail}</p>
            {expanded && <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Why we need it: </span>{step.why}</p>
              <div><p className="font-semibold">Accepted formats</p><ul className="list-disc pl-5">{step.formats.map((f) => <li key={f}>{f}</li>)}</ul></div>
              <div><p className="font-semibold">Include these columns</p><p>{step.columns.join(', ')}</p></div>
              <div><p className="font-semibold">Where to find it</p><ul className="list-disc pl-5">{step.examples.map((f) => <li key={f}>{f}</li>)}</ul></div>
              <p className="text-slate-400">What it unlocks: {step.unlocks}{step.engineUse === 'CONTEXT' ? ' Used as evidence for the AI analyst; no dedicated calculation engine yet.' : ''}</p>
              {step.id === 'profile' ? (
                <form onSubmit={createProfile} className="flex flex-wrap gap-2 items-end">
                  <label>Business name<input required maxLength={120} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="block rounded bg-slate-900 border border-slate-600 p-2" /></label>
                  <label>Industry<input required maxLength={100} value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} placeholder="e.g. HVAC contractor" className="block rounded bg-slate-900 border border-slate-600 p-2" /></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={profile.mode === 'new'} onChange={(e) => setProfile({ ...profile, mode: e.target.checked ? 'new' : 'update' })} />Create as a separate new workspace</label>
                  <button disabled={busy} className="rounded bg-sky-600 px-3 py-2 disabled:opacity-50">{profile.mode === 'new' ? 'Create business workspace' : 'Save business profile'}</button>
                </form>) : (
                <div className="flex flex-wrap gap-2">
                  <Link href={intakeHref(step.id as GuidedStepId, businessId) + '&mode=upload'} className="rounded bg-sky-600 px-3 py-2">Upload CSV / XLSX</Link>
                  <Link href={intakeHref(step.id as GuidedStepId, businessId) + '&mode=manual' + (step.manualMetric ? '&metric=' + step.manualMetric : '')} className="rounded border border-slate-500 px-3 py-2">Enter manually</Link>
                </div>)}
              {i + 1 < guide.steps.length && <button className="text-sky-300 underline" onClick={() => setOpen(guide.steps[i + 1].id)}>Next: {guide.steps[i + 1].title}</button>}
            </div>}
          </section>);
      })}

      <section className="rounded-xl border border-slate-700 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Run the analysis</h2>
        <p className="text-sm text-slate-400">{s.verdict === 'READY' ? 'You have enough to run an analysis. Adding more items makes it more complete.' : 'Required items are still missing; running now will tell you exactly what to add.'}</p>
        <button onClick={run} disabled={busy} className="rounded bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Analyzing... (Grok can take 1-3 minutes)' : 'Run smart analysis'}</button>
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </section>

      {result && workspace && <section id="smart-results" className="space-y-4">
        <h2 className="text-xl font-bold">Your results</h2>
        <p className={result.status === 'NEED_MORE_DATA' ? 'text-amber-300' : 'text-slate-200'}>{result.message}</p>
        {result.error && <p className="text-sm text-amber-300">{result.error}</p>}
        {result.answer && <article className="rounded-lg border border-slate-700 p-4 space-y-3">
          <p className="text-xs text-slate-500">{result.provider === 'GROK' ? `Explained by Grok (${result.model}) using only your cited evidence` : 'Deterministic evidence only (AI explanation unavailable)'} - confidence {result.answer.confidence}</p>
          <p>{result.answer.summary}</p>
          {([['What the evidence shows', result.answer.facts], ['Patterns', result.answer.patterns], ['Possible causes (not proven)', result.answer.hypotheses], ['What to do', result.answer.recommendations]] as const).map(([t, list]) => list.length ? (
            <div key={t}><h3 className="font-semibold">{t}</h3><ul className="list-disc pl-5 text-sm">{list.map((c) => <li key={c.text}>{c.text} <span className="text-xs text-slate-500">[{c.evidenceIds.join(', ')}]</span></li>)}</ul></div>) : null)}
          {result.answer.limitations.length > 0 && <div><h3 className="font-semibold">Limitations</h3><ul className="list-disc pl-5 text-sm text-slate-400">{result.answer.limitations.map((l) => <li key={l}>{l}</li>)}</ul></div>}
          {result.answer.questionsForOwner.length > 0 && <div><h3 className="font-semibold">Questions for you</h3><ul className="list-disc pl-5 text-sm">{result.answer.questionsForOwner.map((l) => <li key={l}>{l}</li>)}</ul></div>}
        </article>}
        {result.findings.length > 0 ? result.findings.map((f) => <FindingCard key={f.id} finding={f} records={result.records} data={workspace} reload={async () => { await run(); }} />)
          : result.status !== 'NEED_MORE_DATA' && <p className="text-slate-400">{INSUFFICIENT}</p>}
        {result.sufficiency.needs.length > 0 && <article className="rounded-lg border border-amber-500/60 p-4 space-y-2">
          <h3 className="font-semibold text-amber-300">{result.status === 'NEED_MORE_DATA' ? 'Need more data before we can conclude anything' : 'To make this analysis stronger'}</h3>
          <ul className="list-disc pl-5 text-sm">{result.sufficiency.needs.map((n) => <li key={n.message}>{n.message} <a href={n.href} className="underline text-sky-300" onClick={() => setOpen(n.stepId)}>Go to this step</a></li>)}</ul>
        </article>}
      </section>}
    </main>);
}
