import { safeNext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in | BizBetter', robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next);
  const error = searchParams.error === 'invalid' ? 'That password is not correct.' : searchParams.error === 'limit' ? 'Too many attempts. Wait a minute and try again.' : searchParams.error === 'origin' ? 'Sign-in request was rejected. Reload the page and try again.' : '';
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form method="post" action="/api/auth/login" className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900/70 p-6 space-y-4" data-testid="login-form">
        <div>
          <h1 className="text-xl font-bold">BizBetter</h1>
          <p className="text-sm text-slate-400">This workspace is private. Enter the access password.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm">Password
          <input name="password" type="password" required autoFocus autoComplete="current-password" maxLength={512} className="mt-1 block w-full rounded bg-slate-950 border border-slate-600 p-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-300" data-testid="login-error">{error}</p>}
        <button type="submit" className="w-full rounded bg-emerald-600 hover:bg-emerald-500 p-2 font-semibold">Sign in</button>
      </form>
    </div>
  );
}
