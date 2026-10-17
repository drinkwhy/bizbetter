'use client';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

/** App shell; the sign-in page renders bare so nothing behind the gate is requested before login. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>;
  return (
    <>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950/70">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </>
  );
}
