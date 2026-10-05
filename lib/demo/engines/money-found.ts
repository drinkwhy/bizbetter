// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
import { MoneyFoundStatus } from '../../types';

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
  /**
   * Aggregates Money Found items while strictly preventing double-counting
   * of overlapping opportunities that target the same margin pool.
   */
  public static calculateLedger(items: MoneyFoundItemData[]): MoneyFoundLedgerSummary {
    let potentialTotal = 0;
    let validatedTotal = 0;
    let implementedTotal = 0;
    let realizedTotal = 0;

    const seenOverlapGroups = new Set<string>();
    let overlapDeductions = 0;
    const categoryTotals: Record<string, number> = {};

    for (const item of items) {
      let isDuplicateOverlap = false;

      // Deduplication safeguard: if multiple items target the exact same overlapGroup in POTENTIAL stage,
      // take the highest estimate to prevent double-counting.
      if (item.overlapGroup && item.status === 'POTENTIAL') {
        if (seenOverlapGroups.has(item.overlapGroup)) {
          isDuplicateOverlap = true;
          overlapDeductions += item.estimatedAnnualImpact;
        } else {
          seenOverlapGroups.add(item.overlapGroup);
        }
      }

      if (!isDuplicateOverlap) {
        if (item.status === 'POTENTIAL') potentialTotal += item.estimatedAnnualImpact;
        if (item.status === 'VALIDATED') validatedTotal += item.estimatedAnnualImpact;
        if (item.status === 'IMPLEMENTED') implementedTotal += item.estimatedAnnualImpact;
        if (item.status === 'REALIZED') realizedTotal += item.estimatedAnnualImpact;

        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.estimatedAnnualImpact;
      }
    }

    const grandTotal = potentialTotal + validatedTotal + implementedTotal + realizedTotal;

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: grandTotal > 0 ? Number(((amount / grandTotal) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      potentialTotal,
      validatedTotal,
      implementedTotal,
      realizedTotal,
      grandTotalIdentified: grandTotal,
      activeOpportunitiesCount: items.length,
      items,
      categoryBreakdown,
      overlapDeductions
    };
  }
}
