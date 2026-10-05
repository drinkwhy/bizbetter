'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  ShieldCheck, 
  Key, 
  RotateCcw, 
  Check, 
  Sparkles,
  Lock,
  Trash2,
  Database
} from 'lucide-react';
import { store } from '@/lib/store';

export default function SettingsPage() {
  const [profile, setProfile] = useState(() => store.getBusiness());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateBusiness(profile);
    setSavedMessage('Business profile updated successfully!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleResetToClean = () => {
    store.resetToCleanState();
    setProfile(store.getBusiness());
    setSavedMessage('Reset to clean production state for real business use!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleLoadDemo = () => {
    window.location.assign('/demo');
    setSavedMessage('Demo data is isolated from this workspace.');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Settings className="w-7 h-7 text-slate-300" />
            <span>Business Profile & Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record owner-entered business context. Financial findings require separate source evidence.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetToClean}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset to Clean Slate</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemo}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load Demo Sandbox</span>
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg">
          <Check className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Business Profile Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Business Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Business Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Industry</label>
            <select
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="HVAC">HVAC Contractor</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="ROOFING">Roofing</option>
              <option value="LANDSCAPING">Landscaping</option>
              <option value="CLEANING">Commercial & Residential Cleaning</option>
              <option value="HANDYMAN">Handyman Services</option>
              <option value="REMODELING">Remodeling & General Contracting</option>
              <option value="OTHER">Other Trade Service</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Number of Employees</label>
            <input
              type="number"
              value={profile.employeeCount}
              onChange={(e) => setProfile({ ...profile, employeeCount: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Approx. Annual Revenue ($)</label>
            <input
              type="number"
              value={profile.approxAnnualRevenue}
              onChange={(e) => setProfile({ ...profile, approxAnnualRevenue: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Location / Operating Area</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Average Job Value ($)</label>
            <input
              type="number"
              value={profile.avgJobValue}
              onChange={(e) => setProfile({ ...profile, avgJobValue: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Completed Jobs / Month</label>
            <input
              type="number"
              value={profile.jobsPerMonth}
              onChange={(e) => setProfile({ ...profile, jobsPerMonth: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Primary Services</label>
            <input
              type="text"
              value={profile.primaryServices}
              onChange={(e) => setProfile({ ...profile, primaryServices: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1 text-xs">Operational Notes</label>
          <textarea
            value={profile.notes || ''}
            onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
          >
            Save Profile Changes
          </button>
        </div>
      </form>

      {/* Security Architecture Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 text-xs">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Security & Data Privacy Isolation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-200 font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Shared Data</span>
            </div>
            <p className="text-[11px]">
              Financial data remains strictly segregated. Your books are never exposed to other businesses or third parties.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-200 font-semibold flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Environment Credentials</span>
            </div>
            <p className="text-[11px]">
              QuickBooks OAuth tokens and integration keys are managed through encrypted server-side environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
