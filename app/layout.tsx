import type { Metadata } from 'next';
import './globals.css';
import { AppChrome } from '@/components/AppChrome';

export const metadata: Metadata = {
  title: 'BizBetter | Business Intelligence & Profitability Platform',
  description: 'Diagnose profit leaks, discover high-leverage opportunities, and track decisions that increase contractor profits.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
