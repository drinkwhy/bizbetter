'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      window.location.assign('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fixed inset-0 z-[100] min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center text-xl font-black">B</div>
          <div>
            <h1 className="text-2xl font-extrabold">Biz<span className="text-emerald-400">Better</span></h1>
            <p className="text-xs text-slate-400">Private business workspace</p>
          </div>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Access password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-emerald-500"
            placeholder="Enter your private access password"
          />
        </div>
        {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}
        <button disabled={busy || !password} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-3 font-semibold text-white">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs leading-relaxed text-slate-500">Authorized access only. Your session expires after 8 hours.</p>
      </form>
    </main>
  );
}
