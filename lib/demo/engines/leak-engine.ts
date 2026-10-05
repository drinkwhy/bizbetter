// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
import { MetricEvidence, SeverityLevel, ConfidenceLevel, LeakCategory } from '../../types';

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
  /**
   * Evaluates business data against established trade benchmarks and trend patterns
   * to detect quantified profit leaks.
   */
  public evaluate(data: BusinessDataSnapshot): EvaluatedLeak[] {
    const leaks: EvaluatedLeak[] = [];
    const revenue = Math.max(data.revenue, 1);

    // 1. Labor Percentage & Overtime Leak
    const laborPercent = (data.laborExpense / revenue) * 100;
    const laborBenchmark = data.industry === 'HVAC' ? 29.0 : 30.0;
    if (laborPercent > laborBenchmark + 3) {
      const excessLaborSpend = data.laborExpense - (revenue * (laborBenchmark / 100));
      const annualImpact = Math.round(excessLaborSpend);
      leaks.push({
        title: 'Elevated Field Labor & Overtime Erosion',
        category: 'LABOR',
        description: `Field labor represents ${laborPercent.toFixed(1)}% of total revenue, which is ${(laborPercent - laborBenchmark).toFixed(1)}% above the industry benchmark of ${laborBenchmark.toFixed(1)}%. Primary contributors are unbillable dispatch transit and Friday emergency overtime premiums.`,
        evidence: [
          {
            metricName: 'Direct Labor % of Revenue',
            currentValue: `${laborPercent.toFixed(1)}%`,
            benchmarkValue: `${laborBenchmark.toFixed(1)}%`,
            unit: '%',
            calculationFormula: `($${data.laborExpense.toLocaleString()} direct labor / $${revenue.toLocaleString()} revenue) * 100`,
            variancePercent: Number((laborPercent - laborBenchmark).toFixed(1))
          },
          {
            metricName: 'Overtime Ratio',
            currentValue: '17.8%',
            benchmarkValue: '< 6.0%',
            unit: '%',
            calculationFormula: 'Overtime labor hours / Total paid field hours',
            variancePercent: 11.8
          }
        ],
        financialImpactAnnual: annualImpact,
        financialImpactMonthly: Math.round(annualImpact / 12),
        confidence: 'HIGH',
        severity: laborPercent > laborBenchmark + 6 ? 'CRITICAL' : 'WARNING',
        recommendedInvestigation: 'Audit technician timecards for Friday afternoon overtime vs. scheduled booking density. Review GPS transit hours between consecutive dispatch zones.'
      });
    }

    // 2. Material Cost Inflation & Price Lag
    const materialPercent = (data.materialExpense / revenue) * 100;
    const materialBenchmark = 21.0;
    if (materialPercent > materialBenchmark + 2.5) {
      const excessMaterialSpend = data.materialExpense - (revenue * (materialBenchmark / 100));
      const annualImpact = Math.round(excessMaterialSpend);
      leaks.push({
        title: 'Material Cost Inflation Not Adjusted in Price Book',
        category: 'MATERIALS',
        description: `Material expenditures are at ${materialPercent.toFixed(1)}% of revenue (target ${materialBenchmark.toFixed(1)}%). Equipment and refrigerant supply costs increased ~14% over past 9 months, but standard equipment quotes and job flat-rates were not refreshed.`,
        evidence: [
          {
            metricName: 'Material Cost %',
            currentValue: `${materialPercent.toFixed(1)}%`,
            benchmarkValue: `${materialBenchmark.toFixed(1)}%`,
            unit: '%',
            calculationFormula: `($${data.materialExpense.toLocaleString()} materials / $${revenue.toLocaleString()} revenue) * 100`,
            variancePercent: Number((materialPercent - materialBenchmark).toFixed(1))
          },
          {
            metricName: 'Supplier Cost Creep vs Pricing',
            currentValue: '+14.2%',
            benchmarkValue: '0.0%',
            unit: '%',
            calculationFormula: 'Vendor price index increase minus price-book adjustment factor'
          }
        ],
        financialImpactAnnual: annualImpact,
        financialImpactMonthly: Math.round(annualImpact / 12),
        confidence: 'HIGH',
        severity: 'CRITICAL',
        recommendedInvestigation: 'Cross-reference supplier invoice line-items for condensers, copper line sets, and 410A refrigerant against current billing catalog markup tiers.'
      });
    }

    // 3. Marketing Inefficiency / Disconnected Ad Spend
    const marketingPercent = (data.marketingExpense / revenue) * 100;
    const marketingBenchmark = 6.5;
    if (data.marketingExpense > 20000 && marketingPercent > marketingBenchmark) {
      const estimatedWastedAdSpend = Math.round(data.marketingExpense * 0.32);
      leaks.push({
        title: 'Ad Spend Misallocation on Non-Converting Channels',
        category: 'MARKETING',
        description: `Total marketing spend is ${marketingPercent.toFixed(1)}% of revenue. Broad Google Search campaigns are consuming $1,800/month with an average Customer Acquisition Cost (CAC) of $310—exceeding the target $120 CAC—while generating high proportions of non-serviceable warranty inquiries.`,
        evidence: [
          {
            metricName: 'Customer Acquisition Cost (Search Ads)',
            currentValue: '$310',
            benchmarkValue: '$120',
            unit: 'USD',
            calculationFormula: '$1,800 monthly ad spend / 5.8 acquired booked jobs',
            variancePercent: 158.3
          },
          {
            metricName: 'Marketing % of Revenue',
            currentValue: `${marketingPercent.toFixed(1)}%`,
            benchmarkValue: `${marketingBenchmark.toFixed(1)}%`,
            unit: '%',
            calculationFormula: `($${data.marketingExpense.toLocaleString()} / $${revenue.toLocaleString()}) * 100`
          }
        ],
        financialImpactAnnual: estimatedWastedAdSpend,
        financialImpactMonthly: Math.round(estimatedWastedAdSpend / 12),
        confidence: 'HIGH',
        severity: 'WARNING',
        recommendedInvestigation: 'Inspect Google Ads search term reports to identify non-local or low-intent queries. Reallocate budget toward Google Local Services Ads (Google Guaranteed) with pay-per-booked-lead pricing.'
      });
    }

    // 4. Ghost SaaS & Redundant Software Subscriptions
    if (data.softwareExpense > 8000) {
      const softwareLeakAnnual = 5400;
      leaks.push({
        title: 'Redundant & Unused Dispatch/Marketing Software Tools',
        category: 'SOFTWARE',
        description: 'Two recurring subscription charges ($450/month and $200/month) remain active for a legacy fleet tracking software and an abandoned automated review plugin that was replaced 6 months ago.',
        evidence: [
          {
            metricName: 'Unused Monthly Recurring SaaS Charges',
            currentValue: '$650/mo',
            benchmarkValue: '$0/mo',
            unit: 'USD',
            calculationFormula: 'FleetPro Legacy ($450/mo) + ReviewBoost ($200/mo)'
          },
          {
            metricName: 'Active User Logins (Last 90 Days)',
            currentValue: '0',
            benchmarkValue: 'N/A',
            unit: 'logins',
            calculationFormula: 'Audit of software vendor access logs'
          }
        ],
        financialImpactAnnual: softwareLeakAnnual,
        financialImpactMonthly: Math.round(softwareLeakAnnual / 12),
        confidence: 'HIGH',
        severity: 'WARNING',
        recommendedInvestigation: 'Confirm cancellation terms and billing portal credentials for FleetPro Legacy and ReviewBoost. Ensure any customer contact records have been backed up before subscription termination.'
      });
    }

    // 5. Callback & Rework Friction
    const callbackRate = data.callbackRatePercent ?? 7.8;
    const targetCallbackRate = 3.0;
    if (callbackRate > targetCallbackRate) {
      const unbilledReworkCost = Math.round((data.jobsCompleted * (callbackRate - targetCallbackRate) / 100) * 340 * 12);
      leaks.push({
        title: 'Excessive Technician Callbacks on Installations',
        category: 'OPERATIONS',
        description: `Callback rate within 30 days of completion is running at ${callbackRate.toFixed(1)}% (target < ${targetCallbackRate.toFixed(1)}%). Each unbilled return trip consumes approximately 2.5 technician hours plus van fuel, directly draining profit.`,
        evidence: [
          {
            metricName: '30-Day Callback Rate',
            currentValue: `${callbackRate.toFixed(1)}%`,
            benchmarkValue: `< ${targetCallbackRate.toFixed(1)}%`,
            unit: '%',
            calculationFormula: 'Repeat warranty visits / Total completed jobs'
          },
          {
            metricName: 'Average Unbilled Cost Per Callback',
            currentValue: '$340',
            benchmarkValue: '$0',
            unit: 'USD',
            calculationFormula: '2.5 hrs labor @ $55 burdened rate + $45 vehicle transit + parts warranty overhead'
          }
        ],
        financialImpactAnnual: unbilledReworkCost,
        financialImpactMonthly: Math.round(unbilledReworkCost / 12),
        confidence: 'MEDIUM',
        severity: 'WARNING',
        recommendedInvestigation: 'Segment callbacks by technician and equipment model. Check if junior technicians received proper startup commissioning training on inverter heat pump installs.'
      });
    }

    // 6. Excessive Unstandardized Discounts
    if (data.discountsGiven > 15000) {
      const leakAnnual = Math.round(data.discountsGiven * 0.65);
      leaks.push({
        title: 'Discretionary Field Discounts Lacking Margin Controls',
        category: 'PRICING',
        description: `Uncontrolled field discounting totaled $${Math.round(data.discountsGiven).toLocaleString()} over the period. Technicians frequently apply 10-15% "manager courtesy" discounts on replacement quotes to close deals on the spot without approval rules.`,
        evidence: [
          {
            metricName: 'Discretionary Discount Volume',
            currentValue: `$${Math.round(data.discountsGiven).toLocaleString()}`,
            benchmarkValue: '< $6,000',
            unit: 'USD',
            calculationFormula: 'Sum of negative line-item adjustments without coupon code'
          }
        ],
        financialImpactAnnual: leakAnnual,
        financialImpactMonthly: Math.round(leakAnnual / 12),
        confidence: 'MEDIUM',
        severity: 'WARNING',
        recommendedInvestigation: 'Institute flat discount policies requiring service manager sign-off for any invoice reduction exceeding $100.'
      });
    }

    return leaks;
  }
}
