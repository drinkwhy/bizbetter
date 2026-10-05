// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
import { ConfidenceLevel } from '../../types';

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
  public evaluate(data: {
    revenue: number;
    jobsCompleted: number;
    averageJobValue: number;
    laborExpense: number;
    materialExpense: number;
    marketingExpense: number;
    industry: string;
  }): EvaluatedOpportunity[] {
    const opportunities: EvaluatedOpportunity[] = [];
    const avgTicket = data.averageJobValue || 1390;
    const totalJobs = data.jobsCompleted || 85 * 12;

    // 1. Strategic Price Optimization on Diagnostic and Installation Quotes
    const priceHikePercent = 0.06; // 6%
    const priceUpsideAnnual = Math.round(data.revenue * priceHikePercent * 0.85); // 85% capture accounting for slight price sensitivity
    opportunities.push({
      title: 'Selective 6% Flat-Rate Price Adjustment',
      category: 'PRICING',
      currentSituation: `Standard diagnostic fees are $89 (market average in Columbus is $109–$129) and standard HVAC system installation margins average 32.5% despite high local demand.`,
      proposedImprovement: `Increase diagnostic trip charges from $89 to $109 (waived upon repair authorization) and increase system replacement flat-rate pricing by 6% to cover supplier price inflation.`,
      monthlyImpact: Math.round(priceUpsideAnnual / 12),
      annualImpact: priceUpsideAnnual,
      confidence: 'HIGH',
      evidence: `Local competitor pricing surveys show Columbus market median diagnostic fee is $115. A 6% price adjustment across 1,020 annual jobs with a conservative 15% elasticity buffer yields substantial margin recovery.`,
      assumptions: `Assumes 95%+ close rate retention on diagnostics when applied toward authorized repairs, and < 3% volume attrition on system replacement bids.`,
      overlapGroup: 'PRICING_RECOVERY'
    });

    // 2. Technician Dispatch Route Density & Schedule Compression
    const billableHoursGainedPerTechPerWeek = 2.5;
    const techCount = 5;
    const burdenedLaborRate = 58;
    const dispatchSavingsAnnual = Math.round(techCount * billableHoursGainedPerTechPerWeek * 50 * (burdenedLaborRate + (avgTicket / 3.5 * 0.4)));
    opportunities.push({
      title: 'Dynamic Zone Dispatching to Reclaim 2.5 Billable Hours/Tech/Week',
      category: 'OPERATIONS',
      currentSituation: `Technicians currently crisscross county lines due to first-come-first-served scheduling, spending an average of 1 hour 45 minutes daily in transit between non-contiguous service calls.`,
      proposedImprovement: `Implement geo-clustered morning/afternoon dispatch zones (North metro vs East metro) and batch preventive maintenance calls by zip code cluster.`,
      monthlyImpact: Math.round(dispatchSavingsAnnual / 12),
      annualImpact: dispatchSavingsAnnual,
      confidence: 'MEDIUM',
      evidence: `Fleet telematics data demonstrates average daily van transit time of 105 minutes. Shifting to cluster dispatch compresses transit to 65 minutes, unlocking ~2.5 additional billable labor hours per technician per week.`,
      assumptions: `5 field technicians working 50 active weeks; 60% of recovered transit time converted to revenue-producing billable service or diagnostic work.`,
      overlapGroup: 'LABOR_EFFICIENCY'
    });

    // 3. Marketing Budget Shift to High-ROI Local Service Ads (LSAs)
    const adShiftSavings = 14400;
    opportunities.push({
      title: 'Shift Underperforming Search Spend to Google Local Services Ads',
      category: 'MARKETING',
      currentSituation: `$1,800/month spent on broad Google Search campaigns yielding $310 customer acquisition cost (CAC), whereas Google Guaranteed LSAs produce booked service calls at $110 CAC.`,
      proposedImprovement: `Reallocate $1,200/month from broad Search campaigns to Google Local Services Ads and optimized review generation in key high-margin zip codes.`,
      monthlyImpact: Math.round(adShiftSavings / 12),
      annualImpact: adShiftSavings,
      confidence: 'HIGH',
      evidence: `Historical 90-day lead conversion shows LSA leads convert to booked jobs at 52% vs. 19% for broad search clicks, with zero charges for non-contractor or out-of-area calls.`,
      assumptions: `Maintains existing total marketing budget without adding additional cash outlay, shifting budget to pay-per-booked-call model.`,
      overlapGroup: 'MARKETING_OPTIMIZATION'
    });

    // 4. Annual Maintenance Agreement (VIP Club) Membership Upsell
    const membershipUplift = 28600;
    opportunities.push({
      title: 'Convert One-Time Repair Customers into VIP Maintenance Members',
      category: 'CUSTOMER_RETENTION',
      currentSituation: `Only 14% of completed service call customers are enrolled in an annual maintenance program ($19/month or $219/year), leaving seasonal revenue volatile.`,
      proposedImprovement: `Introduce a standard technician incentive ($25 spiff per enrolled agreement) and offer membership fee credit toward same-day repair invoices to achieve a 28% conversion rate.`,
      monthlyImpact: Math.round(membershipUplift / 12),
      annualImpact: membershipUplift,
      confidence: 'MEDIUM',
      evidence: `Service businesses with >30% club agreement penetration experience 40% higher off-season job volume and 2.4x higher customer lifetime value over 5 years.`,
      assumptions: `Goal of 15 new active monthly memberships @ $19/mo recurring + estimated 35% higher equipment replacement win rate among members when system failures occur.`,
      overlapGroup: 'MEMBERSHIP_MRR'
    });

    // 5. Pruning Redundant Software & Subscription Waste
    const softwareSavings = 5400;
    opportunities.push({
      title: 'Decommission Redundant Legacy Fleet and Review Software',
      category: 'SOFTWARE',
      currentSituation: `Company pays $650/month across two legacy software platforms with zero user activity over the past 90 days.`,
      proposedImprovement: `Cancel FleetPro Legacy ($450/mo) and ReviewBoost ($200/mo) and consolidate reviews into modern Google Business Profile workflows.`,
      monthlyImpact: Math.round(softwareSavings / 12),
      annualImpact: softwareSavings,
      confidence: 'HIGH',
      evidence: `Billing statements confirm active auto-renewing credit card charges with last user login timestamp in February.`,
      assumptions: `Zero operational disruption; existing primary CRM already includes integrated GPS tracking and automated SMS review requests.`,
      overlapGroup: 'OVERHEAD_REDUCTION'
    });

    return opportunities;
  }
}
