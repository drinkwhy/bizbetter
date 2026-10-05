'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, Lightbulb, Minimize2, RotateCcw, X } from 'lucide-react';
import { readWalkthroughProgress, saveWalkthroughProgress, WALKTHROUGH_STEPS } from '@/lib/walkthrough';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function SetupGuideModal({ isOpen, onClose, onComplete }: SetupGuideModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const step = WALKTHROUGH_STEPS[currentStep];

  useEffect(() => {
    if (!isOpen) return;
    const progress = readWalkthroughProgress();
    setCurrentStep(progress?.completed ? 0 : progress?.step ?? 0);
    setMinimized(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !minimized) panel.current?.focus({ preventScroll: true });
  }, [isOpen, minimized]);

  useEffect(() => {
    if (!isOpen) return;
    const escape = (event: KeyboardEvent) => {
      // Let a page's own modal or input handle Escape when focus is outside the guide.
      if (event.key === 'Escape' && panel.current?.contains(document.activeElement)) {
        saveWalkthroughProgress(currentStep);
        onClose();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isOpen, currentStep, onClose]);

  useEffect(() => {
    if (!isOpen || minimized) { setPosition(null); return; }
    const target = document.querySelector<HTMLElement>(`[data-walkthrough-page="${step.page}"]`);
    if (!target) return;
    const previousDescription = target.getAttribute('aria-describedby');
    target.setAttribute('data-walkthrough-active', 'true');
    target.setAttribute('aria-describedby', [previousDescription, 'walkthrough-description'].filter(Boolean).join(' '));
    const update = () => {
      if (window.innerWidth < 768 || !panel.current) { setPosition(null); return; }
      const rect = target.getBoundingClientRect();
      const card = panel.current.getBoundingClientRect();
      const left = Math.max(16, Math.min(rect.right + 12, window.innerWidth - card.width - 16));
      const top = Math.max(16, Math.min(rect.top, window.innerHeight - card.height - 16));
      setPosition(previous => previous?.left === left && previous.top === top ? previous : { left, top });
    };
    update();
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      target.removeAttribute('data-walkthrough-active');
      if (previousDescription) target.setAttribute('aria-describedby', previousDescription);
      else target.removeAttribute('aria-describedby');
    };
  }, [isOpen, minimized, step.page, pathname]);

  if (!isOpen) return null;

  const pause = () => { saveWalkthroughProgress(currentStep); onClose(); };
  const goToStep = (index: number) => {
    setCurrentStep(index);
    setStorageAvailable(saveWalkthroughProgress(index));
    if (pathname !== WALKTHROUGH_STEPS[index].page) router.push(WALKTHROUGH_STEPS[index].page);
  };
  const finish = () => {
    setStorageAvailable(saveWalkthroughProgress(currentStep, true));
    onComplete?.();
    onClose();
  };

  if (minimized) return (
    <button type="button" onClick={() => setMinimized(false)} className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-indigo-200 shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" aria-label={`Expand walkthrough, step ${currentStep + 1} of ${WALKTHROUGH_STEPS.length}`}>
      <HelpCircle className="h-4 w-4" aria-hidden="true" /> Walkthrough · {currentStep + 1}/{WALKTHROUGH_STEPS.length}
    </button>
  );

  return (
    <section ref={panel} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="walkthrough-title" aria-describedby="walkthrough-description" data-testid="walkthrough" className="fixed bottom-4 right-4 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-indigo-400/40 bg-slate-900 p-5 text-slate-100 shadow-2xl shadow-black/50 outline-none" style={position ? { left: position.left, top: position.top, bottom: 'auto', right: 'auto' } : undefined}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Setup & use · Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize walkthrough to use this page" title="Minimize to work on this page" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Minimize2 className="h-4 w-4" /></button>
          <button type="button" onClick={pause} aria-label="Pause walkthrough" title="Pause and resume later" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div role="progressbar" aria-label="Walkthrough progress" aria-valuemin={1} aria-valuemax={WALKTHROUGH_STEPS.length} aria-valuenow={currentStep + 1} className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-indigo-400 transition-[width] motion-reduce:transition-none" style={{ width: `${((currentStep + 1) / WALKTHROUGH_STEPS.length) * 100}%` }} /></div>
      <div aria-live="polite" aria-atomic="true">
        <h2 id="walkthrough-title" className="mb-3 text-lg font-bold leading-snug">{step.title}</h2>
        <ol id="walkthrough-description" className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">{step.actions.map(action => <li key={action}>{action}</li>)}</ol>
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" /><p><strong>Helpful tip: </strong>{step.tip}</p></div>
      </div>
      {pathname !== step.page ? <button type="button" onClick={() => router.push(step.page)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-indigo-200 hover:bg-slate-700">Open {step.pageLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : <p className="mt-3 text-xs text-slate-400">You’re on {step.pageLabel}. Minimize this tip while you work.</p>}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-700 pt-4">
        <button type="button" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</button>
        <button type="button" onClick={currentStep === WALKTHROUGH_STEPS.length - 1 ? finish : () => goToStep(currentStep + 1)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{currentStep === WALKTHROUGH_STEPS.length - 1 ? 'Finish walkthrough' : 'Next step'}{currentStep === WALKTHROUGH_STEPS.length - 1 ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}</button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <button type="button" onClick={() => goToStep(0)} className="inline-flex items-center gap-1 text-slate-400 hover:text-white"><RotateCcw className="h-3 w-3" aria-hidden="true" />Restart</button>
        <button type="button" onClick={pause} className="text-slate-400 hover:text-white">Save & close guide</button>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">{storageAvailable ? 'Guide progress is remembered in this browser. Steps do not change business data.' : 'Browser storage is unavailable. Guide progress lasts until this page closes.'}</p>
    </section>
  );
}
