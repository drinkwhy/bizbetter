export interface AIAnalystQueryContext {
  businessName: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
  laborExpense: number;
  materialExpense: number;
  marketingExpense: number;
  softwareExpense: number;
  averageJobValue: number;
  jobsCompleted: number;
  activeLeaks: Array<{
    title: string;
    category: string;
    financialImpactAnnual: number;
    severity: string;
    description: string;
  }>;
  opportunities: Array<{
    title: string;
    annualImpact: number;
    proposedImprovement: string;
  }>;
  recentDecisions: Array<{
    problemDetected: string;
    decisionTaken: string;
    outcomeAssessment: string;
    financialImpactActual?: number | null;
  }>;
}

export interface StructuredAnalysisResponse {
  summary: string;
  facts: string[];
  calculations: string[];
  estimates: string[];
  hypotheses: string[];
  recommendedActions: string[];
}

export class AIAnalystEngine {
  public static analyze(..._args: unknown[]): never { throw new Error('Legacy demo analytics are prohibited in production. Use the evidence engine.'); }
}
