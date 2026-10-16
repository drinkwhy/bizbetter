/**
 * Live end-to-end check against the configured AI provider (xAI Grok) using fictional,
 * in-memory data only. Nothing is written to .bizbetter-data. Run with:
 *   npx tsx --env-file=.env scripts/check-smart-analysis-live.ts
 */
import { runSmartAnalysis } from '@/lib/smart-analysis/run';
import { completeDataset, profile, TEST_BUSINESS } from './smart-fixtures';

async function main() {
  if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is not set.');
  console.log('Provider:', process.env.BIZBETTER_AI_PROVIDER, 'model:', process.env.BIZBETTER_AI_GROK_MODEL || process.env.BIZBETTER_AI_MODEL || 'grok-4.7 (default)');
  const t = Date.now();
  const full = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: profile, normalized: [], records: completeDataset() });
  console.log(`\n=== COMPLETE DATASET (${Date.now() - t} ms) ===`);
  console.log(JSON.stringify({ status: full.status, provider: full.provider, model: full.model, error: full.error, message: full.message,
    findings: full.findings.map((f) => ({ title: f.title, impactMinor: f.impactMinor, fix: f.recovery, prevention: f.prevention })), answer: full.answer }, null, 2));
  const thin = await runSmartAnalysis({ businessId: TEST_BUSINESS, business: { name: profile.name }, normalized: [], records: completeDataset().slice(6, 9) });
  console.log('\n=== INCOMPLETE DATASET ===');
  console.log(JSON.stringify({ status: thin.status, message: thin.message, needs: thin.sufficiency.needs }, null, 2));
  const ok = full.status === 'AI_ANALYSIS' && full.findings.length > 0 && (full.answer?.recommendations.length ?? 0) > 0 && thin.status === 'NEED_MORE_DATA' && thin.sufficiency.needs.length > 0;
  console.log(ok ? '\nLIVE CHECK PASSED' : '\nLIVE CHECK FAILED'); if (!ok) process.exit(1);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
