export type Industry = 
  | 'HVAC'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'ROOFING'
  | 'LANDSCAPING'
  | 'CLEANING'
  | 'HANDYMAN'
  | 'REMODELING'
  | 'OTHER';

export type LeakCategory = 
  | 'LABOR'
  | 'MATERIALS'
  | 'MARKETING'
  | 'PRICING'
  | 'OPERATIONS'
  | 'SOFTWARE'
  | 'OVERHEAD';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type SeverityLevel = 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';

export type MoneyFoundStatus = 
  | 'POTENTIAL'
  | 'VALIDATED'
  | 'IMPLEMENTED'
  | 'REALIZED';

export type RecommendationDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type PriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RecommendationStatus = 
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'MODIFIED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type DecisionType = 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
export type OutcomeAssessment = 
  | 'PENDING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILURE'
  | 'UNCERTAIN';

export interface BusinessFinancialMetrics {
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
  averageJobValue: number;
  jobsCompleted: number;
  laborPercent: number;
  materialPercent: number;
  marketingPercent: number;
  overheadPercent: number;
  softwarePercent: number;
  vehiclePercent: number;
  discountsPercent: number;
}

export interface MetricEvidence {
  metricName: string;
  currentValue: number | string;
  benchmarkValue: number | string;
  unit: string;
  calculationFormula: string;
  variancePercent?: number;
}

export interface HealthScore {
  category: 'Profitability' | 'Sales' | 'Operations' | 'Labor' | 'Marketing' | 'Customer Retention' | 'Cash Efficiency';
  score: number; // 0 - 100
  status: 'EXCELLENT' | 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  keyMetric: string;
  currentValue: string;
  targetBenchmark: string;
  explanation: string;
}

export interface AIAnalystMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content?: string;
  structuredResponse?: {
    summary: string;
    facts: string[];
    calculations: string[];
    estimates: string[];
    hypotheses: string[];
    recommendedActions: string[];
  };
}
