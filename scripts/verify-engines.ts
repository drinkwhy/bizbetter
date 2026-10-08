// This suite verifies isolated DEMO fixtures only, never production financial integrity.
import { ProfitLeakEngine } from '../lib/demo/engines/leak-engine';
import { OpportunityEngine } from '../lib/demo/engines/opportunity-engine';
import { MoneyFoundLedger } from '../lib/demo/engines/money-found';
import { DecisionTracker } from '../lib/demo/engines/decision-tracker';
import { AIAnalystEngine } from '../lib/demo/engines/ai-analyst';
import { GeminiAnalystEngine } from '../lib/demo/engines/gemini-analyst';
import { CSVDataImporter } from '../lib/demo/engines/csv-importer';
import { 
  DEMO_FINANCIALS, 
  DEMO_PROFIT_LEAKS, 
  DEMO_OPPORTUNITIES, 
  DEMO_MONEY_FOUND_ITEMS, 
  DEMO_DECISION_RECORDS 
} from '../lib/demo-data';

async function runVerification() {
  console.log('--- STARTING BIZBETTER ENGINE VERIFICATION ---');

  // 1. Test Profit Leak Engine
  console.log('\n[1] Testing ProfitLeakEngine...');
  const leakEngine = new ProfitLeakEngine();
  const leaks = leakEngine.evaluate({
    revenue: DEMO_FINANCIALS.revenue,
    laborExpense: DEMO_FINANCIALS.laborExpense,
    materialExpense: DEMO_FINANCIALS.materialExpense,
    marketingExpense: DEMO_FINANCIALS.marketingExpense,
    overheadExpense: DEMO_FINANCIALS.overheadExpense,
    softwareExpense: DEMO_FINANCIALS.softwareExpense,
    vehicleExpense: DEMO_FINANCIALS.vehicleExpense,
    discountsGiven: DEMO_FINANCIALS.discountsGiven,
    refundsGiven: DEMO_FINANCIALS.refunds,
    jobsCompleted: DEMO_FINANCIALS.jobsCompleted,
    averageJobValue: DEMO_FINANCIALS.averageJobValue,
    industry: 'HVAC'
  });
  console.log(`Detected ${leaks.length} profit leaks.`);
  const totalLeakage = leaks.reduce((acc, l) => acc + l.financialImpactAnnual, 0);
  console.log(`Total quantified annual leak impact: $${totalLeakage.toLocaleString()}`);
  if (leaks.length < 4) throw new Error('Profit leak engine failed to flag expected leaks');

  // 2. Test Opportunity Engine
  console.log('\n[2] Testing OpportunityEngine...');
  const oppEngine = new OpportunityEngine();
  const opps = oppEngine.evaluate({
    revenue: DEMO_FINANCIALS.revenue,
    jobsCompleted: DEMO_FINANCIALS.jobsCompleted,
    averageJobValue: DEMO_FINANCIALS.averageJobValue,
    laborExpense: DEMO_FINANCIALS.laborExpense,
    materialExpense: DEMO_FINANCIALS.materialExpense,
    marketingExpense: DEMO_FINANCIALS.marketingExpense,
    industry: 'HVAC'
  });
  console.log(`Identified ${opps.length} high-leverage opportunities.`);
  const totalUpside = opps.reduce((acc, o) => acc + o.annualImpact, 0);
  console.log(`Total quantified annual upside: $${totalUpside.toLocaleString()}`);
  if (opps.length < 4) throw new Error('Opportunity engine failed to produce expected opportunities');

  // 3. Test Money Found Ledger Deduplication
  console.log('\n[3] Testing MoneyFoundLedger Deduplication & Pipeline...');
  const ledger = MoneyFoundLedger.calculateLedger(DEMO_MONEY_FOUND_ITEMS);
  console.log(`Potential: $${ledger.potentialTotal.toLocaleString()}`);
  console.log(`Validated: $${ledger.validatedTotal.toLocaleString()}`);
  console.log(`Implemented: $${ledger.implementedTotal.toLocaleString()}`);
  console.log(`Realized: $${ledger.realizedTotal.toLocaleString()}`);
  console.log(`Grand Total Money Found: $${ledger.grandTotalIdentified.toLocaleString()}`);
  if (ledger.grandTotalIdentified <= 0) throw new Error('Money Found ledger calculation error');

  // 4. Test Decision Tracking & Learning Extraction
  console.log('\n[4] Testing DecisionTracker Learning Synthesis...');
  const patterns = DecisionTracker.extractLearnings(DEMO_DECISION_RECORDS);
  console.log(`Synthesized ${patterns.length} empirical learning patterns.`);
  patterns.forEach((p, i) => {
    console.log(`  Pattern #${i + 1}: ${p.problemType} -> Success Rate: ${p.successRatePercent}% (+$${p.medianFinancialImpactAnnual.toLocaleString()})`);
  });

  // 5. Test AI Analyst Engine (rule-based)
  console.log('\n[5] Testing AIAnalystEngine (rule-based)...');
  const query = 'Why did profit drop last month?';
  const analysisCtx = {
    businessName: 'Apex Comfort Solutions',
    revenue: DEMO_FINANCIALS.revenue,
    grossProfit: DEMO_FINANCIALS.grossProfit,
    netProfit: DEMO_FINANCIALS.netProfit,
    netMargin: DEMO_FINANCIALS.netMargin,
    laborExpense: DEMO_FINANCIALS.laborExpense,
    materialExpense: DEMO_FINANCIALS.materialExpense,
    marketingExpense: DEMO_FINANCIALS.marketingExpense,
    softwareExpense: DEMO_FINANCIALS.softwareExpense,
    averageJobValue: DEMO_FINANCIALS.averageJobValue,
    jobsCompleted: DEMO_FINANCIALS.jobsCompleted,
    activeLeaks: DEMO_PROFIT_LEAKS,
    opportunities: DEMO_OPPORTUNITIES,
    recentDecisions: DEMO_DECISION_RECORDS
  };
  const analysis = AIAnalystEngine.analyze(query, analysisCtx);
  console.log(`AI Summary: ${analysis.summary}`);
  console.log(`Facts verified: ${analysis.facts.length}`);
  console.log(`Calculations verified: ${analysis.calculations.length}`);
  console.log(`Estimates verified: ${analysis.estimates.length}`);
  console.log(`Hypotheses verified: ${analysis.hypotheses.length}`);
  if (analysis.facts.length === 0 || analysis.calculations.length === 0) {
    throw new Error('AI Analyst did not strictly separate facts and calculations');
  }

  // 6. Test CSV Data Importer
  console.log('\n[6] Testing CSVDataImporter...');
  const sampleCSV = CSVDataImporter.getSampleHVACCSV();
  const parseResult = CSVDataImporter.parseTransactionsCSV(sampleCSV);
  console.log(`Parsed ${parseResult.validRows} rows successfully.`);
  console.log(`Parsed Revenue: $${parseResult.totalRevenue.toLocaleString()}`);
  console.log(`Parsed Expenses: $${parseResult.totalExpenses.toLocaleString()}`);
  if (!parseResult.success || parseResult.validRows === 0) {
    throw new Error('CSV Data Importer failed on sample template');
  }

  // 7. Optional live Gemini demo analyst (only when key is present)
  console.log('\n[7] Testing GeminiAnalystEngine (live, optional)...');
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (!hasGeminiKey) {
    console.log('  Skipping live Gemini call (no GEMINI_API_KEY or GOOGLE_API_KEY set).');
    console.log('  Set the key in .env to exercise the live path.');
  } else {
    try {
      const geminiResult = await GeminiAnalystEngine.analyze(query, analysisCtx);
      console.log(`  Gemini Summary: ${geminiResult.summary.slice(0, 180)}${geminiResult.summary.length > 180 ? '...' : ''}`);
      console.log(`  Facts: ${geminiResult.facts.length} | Calculations: ${geminiResult.calculations.length} | Estimates: ${geminiResult.estimates.length} | Hypotheses: ${geminiResult.hypotheses.length}`);
      if (!geminiResult.summary || geminiResult.facts.length === 0) {
        throw new Error('Gemini returned an incomplete structured response');
      }
      console.log('  Live Gemini demo call succeeded.');
    } catch (err) {
      console.error('  Live Gemini call failed:', err instanceof Error ? err.message : err);
      throw err; // fail the suite if the key is present but the call fails
    }
  }

  console.log('\n>>> ALL ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
}

runVerification().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
