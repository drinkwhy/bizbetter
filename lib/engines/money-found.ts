import { MoneyFoundStatus } from '../types';

export interface MoneyFoundItemData {
  id: string;
  title: string;
  category: string;
  estimatedAnnualImpact: number;
  status: MoneyFoundStatus;
  overlapGroup?: string | null;
  assumptions: string;
  notes?: string | null;
}

export interface MoneyFoundLedgerSummary {
  potentialTotal: number;
  validatedTotal: number;
  implementedTotal: number;
  realizedTotal: number;
  grandTotalIdentified: number;
  activeOpportunitiesCount: number;
  items: MoneyFoundItemData[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  overlapDeductions: number;
}

export class MoneyFoundLedger {
  public static calculateLedger(..._args: unknown[]): never { throw new Error('Legacy demo analytics are prohibited in production. Use the evidence engine.'); }
}
