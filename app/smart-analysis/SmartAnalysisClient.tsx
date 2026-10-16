'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { INSUFFICIENT, type Finding } from '@/lib/evidence/model';
import { intakeHref, type GuidedStep, type GuidedStepId } from '@/lib/smart-analysis/steps';
import type { Sufficiency } from '@/lib/smart-analysis/sufficiency';
import type { Answer } from '@/lib/ai/gateway';
import type { Leak, LeakReport } from '@/lib/leaks/engine';
import { DocumentUploader } from '@/components/DocumentUploader';

type Business = { id: string; name: string; industry?: string };
type Result = { status: 'NEED_MORE_DATA' | 'AI_ANALYSIS' | 'DETERMINISTIC_ONLY'; message: string; provider: string; model: string | null; error?: string; notes?: string[];
  sufficiency: Sufficiency; findings: Finding[]; report: LeakReport; answer: Answer | null; generatedAt: string; businessName?: string; industry?: string | null };
type Guide = { businesses: Business[]; businessId: string; business: Business; steps: GuidedStep[]; sufficiency: Sufficiency; last: Result | null };

export const INDUSTRIES = ['Plumbing contractor', 'HVAC contractor', 'Plumbing & HVAC contractor', 'Electrical contractor', 'Roofing contractor', 'General contractor / remodeling', 'Landscaping & lawn care', 'Cleaning services', 'Pest control', 'Auto repair', 'Restaurant / food service', 'Retail store', 'E-commerce', 'Professional services', 'Healthcare / dental practice', 'Salon / spa', 'Fitness studio', 'Manufacturing', 'Trucking / logistics', 'Real estate / property management'];
const badge: Record<string, string> = { PROVIDED: 'bg-emerald-500/20 text-emerald-300', PARTIAL: 'bg-amber-500/20 text-amber-300', MISSING: 'bg-slate-700 text-slate-300' };
const label: Record<string, string> = { PROVIDED: 'Provided', PARTIAL: 'Partly provided', MISSING: 'Missing' };
const basisLabel: Record<string, string> = { CALCULATED: 'Calculated from your records', ESTIMATE: 'Estimate (assumptions stated)', POSSIBLE: 'Possible - verify' };
const usd = (minor: number | null) => (minor === null ? 'Not quantified' : '$' + (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function SmartAnalysisClient({ initialBusinessId, initialStep }: { initialBusinessId?: string; initialStep?: string }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [businessId, setBusinessId] = useState(initialBusinessId || '');
  const [open, setOpen] = useState<string>(initialStep || '');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [profile, setProfile] = useState({ name: '', industry: '', other: '', mode: 'update' as 'update' | 'new' });

  const load = useCallback(async (id?: string) => {
    const r = await fetch('/api/smart-analysis' + (id ? '?businessId=' + encodeURIComponent(id) : ''), { cache: 'no-store' });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to load guided intake.');
    setGuide(d); setBusinessId(d.businessId); setResult((cur) => cur && cur.generatedAt >= (d.last?.generatedAt || '') ? cur : d.last || null);
    const ind = d.business?.industry || ''; const known = INDUSTRIES.includes(ind);
    setProfile((p) => ({ ...p, name: d.business?.name === 'My Business' ? '' : d.business?.name || '', industry: ind ? (known ? ind : 'Other') : '', other: known ? '' : ind }));
  }, []);
  useEffect(() => { load(initialBusinessId).catch((e) => setError(e.message)); }, [load, initialBusinessId]);
  useEffect(() => { if (open) document.getElementById('step-' + open)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [open]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSaved('');
    const industry = profile.industry === 'Other' ? profile.other.trim() : profile.industry;
    try {
      if (!industry) throw new Error('Choose an industry or describe it under Other.');
      const r = await fetch('/api/intake/businesses', { method: profile.mode === 'new' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, name: profile.name, industry }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to save the business profile.');
      if (profile.mode === 'new') setResult(null); setProfile((p) => ({ ...p, mode: 'update' })); await load(d.business.id); setSaved('Business profile saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.'); } finally { setBusy(false); }
  }
  async function run() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/smart-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Analysis unavailable.');
      setResult(d); setTimeout(() => document.getElementById('smart-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) { setError(err instanceof Error ? err.message : 'Analysis unavailable.'); } finally { setBusy(false); }
  }

  if (!guide) return <main className="p-6 text-slate-300">{error || 'Loading smart analysis...'}</main>;
  const s = guide.sufficiency; const rep = result?.report;
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Smart analysis</h1>
        <p className="text-slate-300">Tell us about the business, drop in your financial files, and BizBetter will organize them and find the ways money is being lost: every dollar figure is calculated from your files and cited to the row or page it came from.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label>Workspace <select value={businessId} onChange={(e) => { setResult(null); load(e.target.value).catch((x) => setError(x.message)); }} className="ml-1 rounded bg-slate-900 border border-slate-600 p-1">
            {guide.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <Link className="underline text-slate-400" href={'/data-intake?businessId=' + encodeURIComponent(businessId)}>Open Data Intake</Link>
        </div>
      </header>

      <section aria-label="Business profile" className="rounded-xl border border-slate-700 p-4 space-y-3">
        <h2 className="text-lg font-semibold">1. Your business</h2>
        <form onSubmit={saveProfile} className="grid sm:grid-cols-3 gap-3 items-end">
          <label className="text-sm">Business name<input required maxLength={120} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="e.g. Northstar Plumbing & Heating" className="block w-full rounded bg-slate-900 border border-slate-600 p-2" /></label>
          <label className="text-sm">Industry<select required value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} className="block w-full rounded bg-slate-900 border border-slate-600 p-2">
            <option value="">Choose...</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}<option>Other</option></select></label>
          {profile.industry === 'Other' ? <label className="text-sm">Describe your industry<input required maxLength={100} value={profile.other} onChange={(e) => setProfile({ ...profile, other: e.target.value })} className="block w-full rounded bg-slate-900 border border-slate-600 p-2" /></label> : <span />}
          <label className="text-sm flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={profile.mode === 'new'} onChange={(e) => setProfile({ ...profile, mode: e.target.checked ? 'new' : 'update' })} />Create this as a separate new workspace (keeps the current workspace's data apart)</label>
          <button disabled={busy} className="rounded bg-sky-600 px-3 py-2 font-semibold disabled:opacity-50">{profile.mode === 'new' ? 'Create workspace' : 'Save business'}</button>
        </form>
        {saved && <p className="text-sm text-emerald-300">{saved}</p>}
      </section>

      <DocumentUploader businessId={businessId} onChange={() => load(businessId).catch(() => undefined)} />

      <section aria-label="Checklist" className="rounded-xl border border-slate-700 p-4 space-y-3">
        <div className="flex justify-between text-sm"><span className="font-semibold">3. What we have so far</span><span>{s.progress.provided} of {s.progress.total} provided{s.progress.partial ? `, ${s.progress.partial} partly` : ''}</span></div>
        <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-500" style={{ width: s.progress.percent + '%' }} /></div>
        <ol className="grid sm:grid-cols-2 gap-2">
          {s.checklist.map((c, i) => { const step = guide.steps.find((x) => x.id === c.id)!; const expanded = open === c.id; return (
            <li key={c.id} id={'step-' + c.id} className={'rounded border px-3 py-2 ' + (expanded ? 'border-sky-500 sm:col-span-2' : 'border-slate-700')}>
              <button onClick={() => setOpen(expanded ? '' : c.id)} className="w-full text-left flex items-center justify-between">
                <span>{i + 1}. {c.title}{c.required && <span className="text-xs text-amber-300"> (required)</span>}</span>
                <span className={'text-xs rounded px-2 py-0.5 ' + badge[c.status]}>{label[c.status]}</span></button>
              <p className="text-xs text-slate-400">{c.detail}</p>
              {expanded && <div className="mt-2 space-y-2 text-sm">
                <p><span className="font-semibold">Why: </span>{step.why}</p>
                <p><span className="font-semibold">Formats: </span>{step.formats.join(' / ')}</p>
                <p><span className="font-semibold">Include: </span>{step.columns.join(', ')}</p>
                <p className="text-slate-400">Where to find it: {step.examples.join('; ')}</p>
                {c.id !== 'profile' && <div className="flex gap-2"><Link href={intakeHref(c.id as GuidedStepId, businessId) + '&mode=manual' + (step.manualMetric ? '&metric=' + step.manualMetric : '')} className="rounded border border-slate-500 px-3 py-1">Enter manually instead</Link></div>}
              </div>}
            </li>); })}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-700 p-4 space-y-2">
        <h2 className="text-lg font-semibold">4. Find the money leaks</h2>
        <p className="text-sm text-slate-400">{s.verdict === 'READY' ? 'You have enough to run the analysis. More documents make it more complete.' : 'Required items are still missing; running now tells you exactly what to add.'}</p>
        <button onClick={run} disabled={busy} className="rounded bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-50" data-testid="run-analysis">{busy ? 'Analyzing... (Grok can take 1-3 minutes)' : 'Run money-leak analysis'}</button>
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </section>

      {result && rep && <section id="smart-results" className="space-y-5" data-testid="report">
        <div className="rounded-xl border border-emerald-600/60 bg-emerald-500/5 p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-emerald-400">Money-leak report</p>
          <h2 className="text-2xl font-bold">{result.businessName || guide.business.name}{(result.industry || guide.business.industry) ? <span className="text-base font-normal text-slate-400"> · {result.industry || guide.business.industry}</span> : null}</h2>
          <p className="text-xs text-slate-500">Generated {new Date(result.generatedAt).toLocaleString()} · as of {rep.asOf} · {result.provider === 'GROK' ? `commentary by Grok (${result.model})` : 'deterministic engines only'}</p>
          {result.status === 'NEED_MORE_DATA' ? <p className="text-amber-300">{result.message}</p> : <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-900/60 p-3"><p className="text-xs text-slate-400">Estimated money lost / recoverable</p><p className="text-3xl font-bold text-emerald-300" data-testid="total">{usd(rep.totalRecoverableMinor)}</p><p className="text-xs text-slate-500">across {rep.leaks.filter((l) => l.recoverable).length} leaks</p></div>
            <div className="rounded-lg bg-slate-900/60 p-3"><p className="text-xs text-slate-400">Net losses already booked</p><p className="text-3xl font-bold text-red-300">{usd(rep.bookedLossMinor)}</p><p className="text-xs text-slate-500">from losing months in the P&L</p></div>
            <div className="rounded-lg bg-slate-900/60 p-3"><p className="text-xs text-slate-400">Checks run</p><p className="text-3xl font-bold">{rep.checks.filter((c) => c.status !== 'NOT_ENOUGH_DATA').length}/{rep.checks.length}</p><p className="text-xs text-slate-500">{rep.checks.filter((c) => c.status === 'NOT_ENOUGH_DATA').length} need more data</p></div>
          </div>}
          {result.status !== 'NEED_MORE_DATA' && <p className="text-xs text-slate-500">{rep.overlapNote}</p>}
          {result.error && <p className="text-sm text-amber-300">{result.error}</p>}
          {result.notes?.map((n) => <p key={n} className="text-xs text-slate-500">{n}</p>)}
        </div>

        {rep.leaks.length > 0 && <div className="space-y-3"><h3 className="text-lg font-semibold">{result.status === 'NEED_MORE_DATA' ? 'Early findings (incomplete data)' : 'Leaks ranked by dollar impact'}</h3>
          {rep.leaks.map((l, i) => <LeakCard key={l.finding.id} leak={l} rank={i + 1} />)}</div>}
        {rep.leaks.length === 0 && result.status !== 'NEED_MORE_DATA' && <p className="text-slate-400">{INSUFFICIENT}</p>}

        {result.answer && result.provider !== 'DETERMINISTIC' && <article className="rounded-lg border border-slate-700 p-4 space-y-3">
          <h3 className="text-lg font-semibold">Analyst commentary</h3>
          <p className="text-xs text-slate-500">Written by Grok from the cited evidence only; every statement lists the evidence it relies on, and any statement with a number not found in your records is removed. Confidence {result.answer.confidence}.</p>
          <p>{result.answer.summary}</p>
          {([['Key facts', result.answer.facts], ['Patterns', result.answer.patterns], ['Possible causes and additional leaks (not proven)', result.answer.hypotheses], ['Recommended actions', result.answer.recommendations]] as const).map(([t, list]) => list.length ? (
            <div key={t}><h4 className="font-semibold">{t}</h4><ul className="list-disc pl-5 text-sm space-y-1">{list.map((c) => <li key={c.text}>{c.text} <span className="text-xs text-slate-500">[{c.evidenceIds.slice(0, 4).join(', ')}{c.evidenceIds.length > 4 ? ', ...' : ''}]</span></li>)}</ul></div>) : null)}
          {result.answer.questionsForOwner.length > 0 && <div><h4 className="font-semibold">Questions for you</h4><ul className="list-disc pl-5 text-sm">{result.answer.questionsForOwner.map((q) => <li key={q}>{q}</li>)}</ul></div>}
        </article>}

        <article className="rounded-lg border border-slate-700 p-4"><h3 className="font-semibold mb-2">Coverage: what was checked</h3>
          <table className="w-full text-sm"><tbody>{rep.checks.map((c) => <tr key={c.category} className="border-t border-slate-800"><td className="py-1 pr-2">{c.label}</td>
            <td className="pr-2"><span className={'text-xs rounded px-2 py-0.5 ' + (c.status === 'FOUND' ? 'bg-red-500/20 text-red-300' : c.status === 'NONE_FOUND' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300')}>{c.status === 'FOUND' ? 'Leak found' : c.status === 'NONE_FOUND' ? 'No leak found' : 'Need more data'}</span></td>
            <td className="text-slate-400">{c.note}{c.status === 'NOT_ENOUGH_DATA' && <> <button className="underline text-sky-300" onClick={() => setOpen(c.step)}>Add it</button></>}</td></tr>)}</tbody></table></article>

        {result.sufficiency.needs.length > 0 && <article className="rounded-lg border border-amber-500/60 p-4 space-y-2">
          <h3 className="font-semibold text-amber-300">{result.status === 'NEED_MORE_DATA' ? 'Need more data before we can conclude anything' : 'To make this analysis stronger'}</h3>
          <ul className="list-disc pl-5 text-sm">{result.sufficiency.needs.map((n) => <li key={n.message}>{n.message} <a href={n.href} className="underline text-sky-300" onClick={() => setOpen(n.stepId)}>Go to this step</a></li>)}</ul>
        </article>}
      </section>}
    </main>);
}

function LeakCard({ leak: l, rank }: { leak: Leak; rank: number }) {
  const f = l.finding;
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 space-y-3" data-testid="leak-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-xs text-slate-500">#{rank} · {l.label}</p><h4 className="text-lg font-bold">{f.title}</h4><p className="text-xs text-slate-500">{f.periodStart} to {f.periodEnd} · {basisLabel[l.basis]}</p></div>
        <div className="text-right"><p className={'text-2xl font-semibold ' + (l.recoverable ? 'text-emerald-400' : 'text-red-300')}>{usd(f.impactMinor)}</p><p className="text-xs text-slate-500">{l.recoverable ? 'Recoverable / avoidable' : 'Loss already booked'}</p></div>
      </div>
      <div><h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">What we found</h5><ul className="mt-1 list-disc pl-5 text-sm space-y-0.5">{l.details.slice(0, 8).map((d) => <li key={d}>{d}</li>)}{l.details.length > 8 && <li className="text-slate-500">and {l.details.length - 8} more</li>}</ul></div>
      <div><h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Likely causes</h5><ul className="mt-1 list-disc pl-5 text-sm">{l.causes.map((c) => <li key={c}>{c}</li>)}</ul></div>
      <div><h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step-by-step fix</h5><ol className="mt-1 list-decimal pl-5 text-sm space-y-0.5">{f.recovery.map((c) => <li key={c}>{c}</li>)}</ol></div>
      <div><h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prevention</h5><ul className="mt-1 list-disc pl-5 text-sm">{f.prevention.map((c) => <li key={c}>{c}</li>)}</ul></div>
      <details className="text-xs text-slate-400"><summary className="cursor-pointer">How this was calculated</summary><p className="mt-1">Formula: {f.formula}</p>{f.assumptions.map((a) => <p key={a}>Assumption: {a}</p>)}<p>Cites {f.sourceRecordIds.length} source record(s) from: {f.sourceSystems.join(', ')}</p></details>
    </article>);
}
