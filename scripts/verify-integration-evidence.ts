import assert from 'node:assert/strict';
import { analyzeEvidence } from '../lib/integrations/analysis';
import { syncProvider } from '../lib/integrations/service';
async function main(){
 const base={source:'Unit fixture',periodStart:'2026-01-01',periodEnd:'2026-01-31',currency:'USD',complete:true,records:1};
 assert.equal(analyzeEvidence(base).findings.length,0);
 assert.equal(analyzeEvidence({...base,netProfit:-120}).findings[0].amount,120);
 assert.equal(analyzeEvidence({...base,complete:false,netProfit:-120}).findings.length,0);
 assert.equal(analyzeEvidence({...base,netProfit:NaN}).findings.length,0);
 const fees=analyzeEvidence({...base,fees:12}).findings[0];assert.equal(fees.kind,'review');assert.match(fees.evidence,/not proven waste/);
 assert.ok(fees.recovery.length>=3);assert.ok(fees.prevention.length>=2);
 await assert.rejects(syncProvider('../secret'),/not implemented/);
 const old=process.env.BIZBETTER_STRIPE_SECRET_KEY;delete process.env.BIZBETTER_STRIPE_SECRET_KEY;
 await assert.rejects(syncProvider('stripe'),/not configured/);if(old)process.env.BIZBETTER_STRIPE_SECRET_KEY=old;
 console.log('Evidence checks passed: missing/partial data, loss calculations, fee classification, recovery guides, provider allowlist, missing credentials.');
}main().catch(e=>{console.error(e);process.exitCode=1;});
