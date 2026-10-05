import { ConfidenceLevel } from '../types';

export interface EvaluatedOpportunity {
  title: string;
  category: string;
  currentSituation: string;
  proposedImprovement: string;
  monthlyImpact: number;
  annualImpact: number;
  confidence: ConfidenceLevel;
  evidence: string;
  assumptions: string;
  overlapGroup?: string;
}

export class OpportunityEngine {
  public evaluate(..._args: unknown[]): never { throw new Error('Legacy demo analytics are prohibited in production. Use the evidence engine.'); }
}
