'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  DollarSign, 
  AlertTriangle, 
  Lightbulb, 
  Coins, 
  CheckSquare, 
  GitFork, 
  BarChart3, 
  Bot, 
  Plug, 
  Settings 
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Financials', href: '/financials', icon: DollarSign },
  { name: 'Profit Leaks', href: '/leaks', icon: AlertTriangle },
  { name: 'Opportunities', href: '/opportunities', icon: Lightbulb },
  { name: 'Money Found', href: '/money-found', icon: Coins, highlight: true },
  { name: 'Recommendations', href: '/recommendations', icon: CheckSquare },
  { name: 'Decisions', href: '/decisions', icon: GitFork },
  { name: 'Results', href: '/results', icon: BarChart3 },
  { name: 'AI Analyst', href: '/analyst', icon: Bot, isNew: true },
  { name: 'Integrations & CSV', href: '/integrations', icon: Plug },
  { name: 'Data Intake', href: '/data-intake', icon: Plug, isNew: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-2 md:p-4 space-y-1">
        <div className="hidden md:block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Executive Control
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                data-walkthrough-page={item.href}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                title={item.name}
                className={`flex items-center justify-center md:justify-between px-3 py-3 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center md:space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{item.name}</span>
                </div>
                {item.isNew && (
                  <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 30-Second Diagnosis Card at bottom of sidebar */}
      <div className="hidden md:block p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
        <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Core Diagnosis</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Review your numbers, investigate one issue, record an action, and measure its result. Open <strong className="text-indigo-300">Setup walkthrough</strong> for step-by-step help.
        </p>
      </div>
    </aside>
  );
};
