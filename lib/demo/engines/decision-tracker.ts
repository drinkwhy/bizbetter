// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
import { DecisionType, OutcomeAssessment } from '../../types';

export interface DecisionRecordInput {
  businessId: string;
  recommendationId?: string;
  problemDetected: string;
  recommendationSummary: string;
  evidenceSnapshot: Record<string, any>;
  decisionTaken: DecisionType;
  decisionNotes: string;
  expectedOutcome: string;
  actualOutcome?: string;
  timeUntilResultDays?: number;
  financialImpactActual?: number;
  outcomeAssessment?: OutcomeAssessment;
  learnings?: string;
}

export interface DecisionLearningPattern {
  businessIndustry: string;
  problemType: string;
  actionTaken: string;
  sampleSize: number;
  successRatePercent: number;
  medianFinancialImpactAnnual: number;
  medianDaysToOutcome: number;
  insight: string;
}

export class DecisionTracker {
  /**
   * Evaluates decision records to extract empirical learning loops:
   * "When businesses with characteristics X encounter problem Y, action Z tends to produce outcome Q."
   */
  public static extractLearnings(records: {
    decisionTaken: string;
    outcomeAssessment: string;
    financialImpactActual?: number | null;
    problemDetected: string;
    recommendationSummary: string;
    timeUntilResultDays?: number | null;
  }[]): DecisionLearningPattern[] {
    const learnings: DecisionLearningPattern[] = [];

    // Pattern 1: Price book adjustment response
    const pricingDecisions = records.filter(r => 
      r.problemDetected.toLowerCase().includes('price') || 
      r.problemDetected.toLowerCase().includes('inflation')
    );

    if (pricingDecisions.length > 0) {
      learnings.push({
        businessIndustry: 'HVAC Contractor ($1M - $3M Revenue)',
        problemType: 'Material Cost Inflation & Flat-Rate Price Lag',
        actionTaken: 'Implemented 6% flat-rate markup adjustment on diagnostics and system replacements',
        sampleSize: pricingDecisions.length,
        successRatePercent: 100,
        medianFinancialImpactAnnual: 31200,
        medianDaysToOutcome: 45,
        insight: 'Customer attrition remained under 2.1% while immediately restoring gross margins from 39% back to 46%.'
      });
    }

    // Pattern 2: Software subscription pruning
    const softwareDecisions = records.filter(r => 
      r.problemDetected.toLowerCase().includes('software') || 
      r.problemDetected.toLowerCase().includes('subscription')
    );

    if (softwareDecisions.length > 0) {
      learnings.push({
        businessIndustry: 'Service Trade Contractors',
        problemType: 'Zombie SaaS Subscriptions and Legacy Tool Duplication',
        actionTaken: 'Immediate cancellation of unused fleet tracking & review tools',
        sampleSize: softwareDecisions.length,
        successRatePercent: 100,
        medianFinancialImpactAnnual: 5400,
        medianDaysToOutcome: 7,
        insight: 'Zero operational disruption occurred; $450/month was immediately recovered back to cash flow with 100% margin capture.'
      });
    }

    return learnings;
  }
}
