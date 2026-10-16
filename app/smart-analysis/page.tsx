import { SmartAnalysisClient } from './SmartAnalysisClient';
export const dynamic = 'force-dynamic';
export default function Page({ searchParams }: { searchParams?: { businessId?: string; step?: string } }) {
  return <SmartAnalysisClient initialBusinessId={searchParams?.businessId} initialStep={searchParams?.step} />;
}
