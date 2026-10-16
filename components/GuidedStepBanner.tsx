'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GUIDED_STEPS, guidedStepHref, type GuidedStep } from '@/lib/smart-analysis/steps';

/** Shown on Data Intake when the owner arrives from a guided smart-analysis step. */
export function GuidedStepBanner() {
  const [step, setStep] = useState<GuidedStep | null>(null), [mode, setMode] = useState('');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setStep(GUIDED_STEPS.find((s) => s.id === q.get('step')) || null); setMode(q.get('mode') || '');
  }, []);
  if (!step) return null;
  return (
    <aside className="rounded-xl border border-sky-500/60 bg-sky-500/10 p-4 text-sm space-y-1">
      <p className="font-semibold text-sky-200">Guided step: {step.title}{mode === 'manual' ? ' (manual entry below)' : mode === 'upload' ? ' (upload below)' : ''}</p>
      <p>{step.why}</p>
      <p><span className="text-slate-400">Include: </span>{step.columns.join(', ')}</p>
      <p><span className="text-slate-400">Formats: </span>{step.formats.join(' / ')}</p>
      <p className="text-slate-400">After staging, review the column mapping, confirm it and commit. Then return to the checklist.</p>
      <Link href={guidedStepHref(step.id)} className="inline-block underline text-sky-300">Back to the smart analysis checklist</Link>
    </aside>);
}
