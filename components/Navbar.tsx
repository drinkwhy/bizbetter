'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  TrendingUp, 
  Sparkles, 
  HelpCircle, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { SetupGuideModal } from './SetupGuideModal';
import { readWalkthroughProgress } from '@/lib/walkthrough';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  businessName?: string;
  industry?: string;
  moneyFoundTotal?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  businessName: fallbackName = 'My Business',
  industry: fallbackIndustry = '',
  moneyFoundTotal
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  // Show the real selected workspace (?businessId= or the main one), not a placeholder.
  const pathname = usePathname(); const [ws, setWs] = useState<{ name: string; industry?: string } | null>(null);
  useEffect(() => { const want = new URLSearchParams(window.location.search).get('businessId'); fetch('/api/intake/businesses', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { const list = (d?.businesses || []) as Array<{ id: string; name: string; industry?: string }>; const b = list.find((x) => x.id === want) || list[0]; if (b) setWs({ name: b.name, industry: b.industry }); }).catch(() => undefined); }, [pathname]);
  const businessName = ws?.name || fallbackName; const industry = ws ? ws.industry || 'Industry not set' : fallbackIndustry;
  const closeGuide = useCallback(() => setIsGuideOpen(false), []);
  // Access-gate state comes from the server at runtime (null until known: nothing gate-specific renders).
  const [auth, setAuth] = useState<{ gate: boolean; online: boolean } | null>(null);
  useEffect(() => { fetch('/api/auth/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setAuth({ gate: !!d.gate, online: !!d.online }); }).catch(() => undefined); }, []);

  useEffect(() => {
    if (!readWalkthroughProgress()) setIsGuideOpen(true);
  }, []);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 min-h-16 py-3">
            {/* Brand & Active Business */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/40">
                  B
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Biz<span className="text-emerald-400">Better</span>
                </span>
              </Link>

              <div className="hidden md:flex items-center pl-4 border-l border-slate-700/80 space-x-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-sm font-semibold text-slate-200">{businessName}</span>
                  <span className="text-xs text-slate-400 ml-2 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono">
                    {industry}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Status: Production Real Business Badge & Setup Guide Trigger */}
            <div className="flex items-center space-x-3">
              {auth ? (
                <div data-testid="workspace-badge" className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{auth.online ? 'Online' : 'Local workspace'}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Setup walkthrough</span>
              </button>
            </div>

            {/* Right: Money Found Tracker Pill & AI Analyst */}
            <div className="flex items-center space-x-3">
              <Link 
                href="/money-found" 
                className="group hidden sm:flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Money Found
                  </div>
                  <div className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                    {typeof moneyFoundTotal === 'number' ? `$${moneyFoundTotal.toLocaleString()}` : 'View ledger'}
                    {typeof moneyFoundTotal === 'number' ? <span className="text-[10px] text-slate-400 font-normal ml-1">/yr</span> : null}
                  </div>
                </div>
              </Link>

              <Link
                href="/analyst"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden sm:inline">Ask AI Analyst</span>
              </Link>

              {auth?.gate ? (
                <form method="post" action="/api/auth/logout">
                  <button
                    type="submit"
                    title="Sign out of BizBetter"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sign out</span>
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Interactive Step-by-Step Setup & Connection Guide Modal */}
      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
      />
    </>
  );
};
