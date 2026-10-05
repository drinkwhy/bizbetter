import { DecisionType, OutcomeAssessment } from '../types';

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
  public static extractLearnings(..._args: unknown[]): never { throw new Error('Legacy demo analytics are prohibited in production. Use the evidence engine.'); }
}
