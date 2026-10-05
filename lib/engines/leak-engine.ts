import { MetricEvidence, SeverityLevel, ConfidenceLevel, LeakCategory } from '../types';

export interface EvaluatedLeak {
  title: string;
  category: LeakCategory;
  description: string;
  evidence: MetricEvidence[];
  financialImpactAnnual: number;
  financialImpactMonthly: number;
  confidence: ConfidenceLevel;
  severity: SeverityLevel;
  recommendedInvestigation: string;
}

export interface BusinessDataSnapshot {
  revenue: number;
  laborExpense: number;
  materialExpense: number;
  marketingExpense: number;
  overheadExpense: number;
  softwareExpense: number;
  vehicleExpense: number;
  discountsGiven: number;
  refundsGiven: number;
  jobsCompleted: number;
  averageJobValue: number;
  overtimeHoursPercent?: number; // e.g. 18% of total hours
  callbackRatePercent?: number;  // e.g. 8.4%
  adLeadCount?: number;
  adCustomerCount?: number;
  industry: string;
}

export class ProfitLeakEngine {
  public evaluate(..._args: unknown[]): never { throw new Error('Legacy demo analytics are prohibited in production. Use the evidence engine.'); }
}
