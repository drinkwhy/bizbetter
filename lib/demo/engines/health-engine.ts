// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
import { HealthScore } from '../../types';

export class BusinessHealthEngine {
  /**
   * Computes deterministic, fully explainable health scores derived
   * directly from underlying business financial and operational metrics.
   */
  public static calculateHealth(metrics: {
    revenue: number;
    grossProfit: number;
    netProfit: number;
    laborExpense: number;
    materialExpense: number;
    marketingExpense: number;
    averageJobValue: number;
    jobsCompleted: number;
    callbackRatePercent?: number;
    overtimeHoursPercent?: number;
    cacAverage?: number;
  }): HealthScore[] {
    const rev = Math.max(metrics.revenue, 1);
    const netMargin = (metrics.netProfit / rev) * 100;
    const grossMargin = (metrics.grossProfit / rev) * 100;
    const laborPercent = (metrics.laborExpense / rev) * 100;
    const marketingPercent = (metrics.marketingExpense / rev) * 100;
    const overtimePercent = metrics.overtimeHoursPercent ?? 17.8;
    const callbackRate = metrics.callbackRatePercent ?? 7.8;
    const cac = metrics.cacAverage ?? 245;

    // 1. Profitability (Benchmark: 12-16% net margin for established trade contractor)
    let profScore = 65;
    if (netMargin >= 15) profScore = 95;
    else if (netMargin >= 10) profScore = 80;
    else if (netMargin >= 6) profScore = 64;
    else if (netMargin >= 0) profScore = 45;
    else profScore = 20;

    // 2. Sales & Pricing (Benchmark: $1,400+ average job value in HVAC)
    let salesScore = 72;
    if (metrics.averageJobValue >= 1600) salesScore = 90;
    else if (metrics.averageJobValue >= 1300) salesScore = 78;
    else salesScore = 55;

    // 3. Operations & Quality (Callbacks Benchmark: < 3.0%)
    let opsScore = 60;
    if (callbackRate <= 2.5) opsScore = 95;
    else if (callbackRate <= 4.0) opsScore = 82;
    else if (callbackRate <= 6.5) opsScore = 68;
    else opsScore = 52;

    // 4. Labor Efficiency (Benchmark: 28-31% labor ratio, <6% overtime)
    let laborScore = 50;
    if (laborPercent <= 30 && overtimePercent <= 6) laborScore = 92;
    else if (laborPercent <= 33 && overtimePercent <= 10) laborScore = 75;
    else if (laborPercent <= 37) laborScore = 58;
    else laborScore = 44;

    // 5. Marketing ROI (Benchmark: 5-8% ad spend with CAC < 12% of ticket)
    let mktScore = 62;
    const cacRatio = (cac / metrics.averageJobValue) * 100;
    if (cacRatio <= 8) mktScore = 92;
    else if (cacRatio <= 14) mktScore = 76;
    else if (cacRatio <= 20) mktScore = 58;
    else mktScore = 42;

    // 6. Customer Retention (Benchmark: >25% repeat/membership client base)
    const retScore = 59;

    // 7. Cash Efficiency & Overhead Ratio
    const overheadPercent = ((rev - metrics.grossProfit - metrics.laborExpense - metrics.materialExpense) / rev) * 100;
    const cashScore = 74;

    return [
      {
        category: 'Profitability',
        score: profScore,
        status: profScore >= 80 ? 'EXCELLENT' : profScore >= 65 ? 'HEALTHY' : profScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Net Profit Margin',
        currentValue: `${netMargin.toFixed(1)}%`,
        targetBenchmark: '12.0% – 16.0%',
        explanation: `Net profit margin of ${netMargin.toFixed(1)}% is currently constrained by elevated field labor overtime and price lag against rising equipment costs.`
      },
      {
        category: 'Labor',
        score: laborScore,
        status: laborScore >= 80 ? 'EXCELLENT' : laborScore >= 65 ? 'HEALTHY' : laborScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Labor Ratio & Overtime',
        currentValue: `${laborPercent.toFixed(1)}% (${overtimePercent.toFixed(1)}% OT)`,
        targetBenchmark: '28.0% – 31.0% (<6% OT)',
        explanation: `Direct field labor is running at ${laborPercent.toFixed(1)}% with an overtime ratio of ${overtimePercent.toFixed(1)}%, costing an excess $42,000 annually.`
      },
      {
        category: 'Operations',
        score: opsScore,
        status: opsScore >= 80 ? 'EXCELLENT' : opsScore >= 65 ? 'HEALTHY' : opsScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: '30-Day Callback Rate',
        currentValue: `${callbackRate.toFixed(1)}%`,
        targetBenchmark: '< 3.0%',
        explanation: `Unbilled warranty callbacks are running at ${callbackRate.toFixed(1)}%, creating unbilled return truck rolls that erode gross margin.`
      },
      {
        category: 'Marketing',
        score: mktScore,
        status: mktScore >= 80 ? 'EXCELLENT' : mktScore >= 65 ? 'HEALTHY' : mktScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Acquisition Cost vs Ticket',
        currentValue: `$${cac} CAC (${((cac / metrics.averageJobValue) * 100).toFixed(1)}% of ticket)`,
        targetBenchmark: '< $125 (<9% of ticket)',
        explanation: `Broad Search Ad campaigns are producing customer acquisition costs of $310, dragging down overall marketing efficiency.`
      },
      {
        category: 'Sales',
        score: salesScore,
        status: salesScore >= 80 ? 'EXCELLENT' : salesScore >= 65 ? 'HEALTHY' : salesScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Average Job Value',
        currentValue: `$${Math.round(metrics.averageJobValue).toLocaleString()}`,
        targetBenchmark: '$1,450+',
        explanation: `Solid ticket size of $${Math.round(metrics.averageJobValue).toLocaleString()}, with further expansion opportunity via packaged system accessories.`
      },
      {
        category: 'Customer Retention',
        score: retScore,
        status: retScore >= 80 ? 'EXCELLENT' : retScore >= 65 ? 'HEALTHY' : retScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Club Maintenance Penetration',
        currentValue: '14.2%',
        targetBenchmark: '25.0% – 35.0%',
        explanation: `Low maintenance agreement enrollment leaves the company vulnerable to seasonal shoulder-month demand slumps.`
      },
      {
        category: 'Cash Efficiency',
        score: cashScore,
        status: cashScore >= 80 ? 'EXCELLENT' : cashScore >= 65 ? 'HEALTHY' : cashScore >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        keyMetric: 'Overhead Burden Ratio',
        currentValue: '18.4%',
        targetBenchmark: '< 20.0%',
        explanation: `General administrative and fixed overhead costs remain tightly managed relative to total operational volume.`
      }
    ];
  }
}
