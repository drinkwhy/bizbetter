// ISOLATED DEMO / TEST ALGORITHM. NEVER IMPORT FROM PRODUCTION ROUTES.
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
  /**
   * Processes executive questions using verified ledger data, strictly separating:
   * 1. FACTS (verifiable data from books)
   * 2. CALCULATIONS (mathematical formulas and variances)
   * 3. ESTIMATES (projections and industry benchmark models)
   * 4. HYPOTHESES (testable business root-cause theories)
   */
  public static analyze(query: string, ctx: AIAnalystQueryContext): StructuredAnalysisResponse {
    const q = query.toLowerCase();

    // 1. "Where am I losing the most money?"
    if (q.includes('losing the most money') || q.includes('biggest leak') || q.includes('where is money lost')) {
      const topLeak = ctx.activeLeaks.sort((a, b) => b.financialImpactAnnual - a.financialImpactAnnual)[0];
      const laborPct = ((ctx.laborExpense / ctx.revenue) * 100).toFixed(1);

      return {
        summary: `Your single largest profit drain is direct field labor and overtime, costing an estimated $${topLeak?.financialImpactAnnual.toLocaleString() || '42,000'} annually, closely followed by unadjusted material price creep.`,
        facts: [
          `Total direct field labor expense was $${ctx.laborExpense.toLocaleString()} against $${ctx.revenue.toLocaleString()} in revenue.`,
          `Current direct labor represents ${laborPct}% of total revenue.`,
          `Overtime hours represented 17.8% of total field payroll last quarter.`
        ],
        calculations: [
          `Industry benchmark for residential HVAC field labor is 29.0%. Current variance: +${(Number(laborPct) - 29.0).toFixed(1)}% percentage points.`,
          `Excess labor dollar drag = $${ctx.laborExpense.toLocaleString()} - ($${ctx.revenue.toLocaleString()} × 0.29) = $${Math.round(ctx.laborExpense - (ctx.revenue * 0.29)).toLocaleString()}.`
        ],
        estimates: [
          `$42,000 annual profit recovery if field overtime is brought below 6% through geo-clustered scheduling.`,
          `Additional $28,500 annual recovery available by indexing flat-rate price book to supplier copper/refrigerant cost sheets.`
        ],
        hypotheses: [
          `Dispatch scheduling is reactive: Friday service call overruns are generating double-time wages that cannot be billed back to clients.`,
          `Unbillable travel transit between non-contiguous service zones is consuming 1.5+ hours per technician per day.`
        ],
        recommendedActions: [
          `Institute geo-zoned dispatch scheduling starting with North Metro zip codes.`,
          `Enact a mandatory service manager dispatch cutoff after 3:30 PM for non-emergency calls to halt Friday overtime.`
        ]
      };
    }

    // 2. "Why did profit drop last month?"
    if (q.includes('profit drop') || q.includes('why did profit fall') || q.includes('margin drop')) {
      return {
        summary: `Net margin contracted primarily because supplier costs increased 14.2% while billing rates remained static, compounded by elevated Friday overtime hours during peak heat weeks.`,
        facts: [
          `Net profit is $${ctx.netProfit.toLocaleString()} (${ctx.netMargin.toFixed(1)}% margin) compared to target benchmark of 14.0%.`,
          `Material expense climbed to $${ctx.materialExpense.toLocaleString()} (${((ctx.materialExpense / ctx.revenue) * 100).toFixed(1)}% of revenue).`,
          `Emergency callback rate reached 7.8% over the trailing 60 days.`
        ],
        calculations: [
          `Gross margin compressed from 44.5% to 38.2% (-630 basis points).`,
          `Average unbilled cost per warranty callback trip = $340 across 2.5 technician hours.`
        ],
        estimates: [
          `$2,375/month in net margin is being forfeited by not applying a 6% supplier inflation index to system replacement quotes.`,
          `$1,400/month is being drained by unbilled warranty callbacks on inverter heat pump startups.`
        ],
        hypotheses: [
          `Field technicians are not receiving real-time wholesale price updates when quoting replacement condenser units in the field.`,
          `Junior installers are skipping vacuum decay testing during equipment commissioning, causing warranty callbacks within 30 days.`
        ],
        recommendedActions: [
          `Update your digital price catalog immediately with current supplier equipment markups.`,
          `Implement a 5-point digital commissioning checklist with photos before technicians can mark an install job as complete.`
        ]
      };
    }

    // 3. "Should I raise prices?"
    if (q.includes('raise prices') || q.includes('price increase') || q.includes('pricing')) {
      return {
        summary: `Yes. Your diagnostic fees ($89) and replacement margins are below the Columbus market median ($115+), while equipment input costs have risen 14.2%. A selective 6% price adjustment would inject ~$31,200 of pure profit.`,
        facts: [
          `Your average job ticket is $${Math.round(ctx.averageJobValue).toLocaleString()} across ${ctx.jobsCompleted} completed jobs.`,
          `Standard diagnostic dispatch fee is $89.00.`,
          `Gross margin is currently 38.2% vs. healthy trade benchmark of 45.0%+.`
        ],
        calculations: [
          `Increasing diagnostic fee from $89 to $109 yields +$20 per diagnostic call across ~480 annual diagnostics = +$9,600 net cash flow.`,
          `A 6% flat-rate adjustment on system replacements (avg $7,200 ticket) adds $432 per unit with 100% contribution margin.`
        ],
        estimates: [
          `Total estimated annual profit uplift: $31,200 (accounting for a conservative 2% price elasticity drop-off).`,
          `Risk of lost jobs is negligible (<2.5%) when diagnostic fees are credited toward authorized repairs.`
        ],
        hypotheses: [
          `Customers select your service primarily based on rapid dispatch availability and positive Google reviews rather than baseline diagnostic pricing.`,
          `Technicians are hesitant to quote full flat-rate prices due to lack of confidence in value articulation.`
        ],
        recommendedActions: [
          `Increase diagnostic service fee from $89 to $109 effective next Monday.`,
          `Apply diagnostic fee credit towards same-day authorized repairs exceeding $350 to maintain 92%+ conversion.`
        ]
      };
    }

    // 4. "Why is labor increasing?"
    if (q.includes('labor increasing') || q.includes('labor high') || q.includes('overtime')) {
      return {
        summary: `Direct field labor is at ${((ctx.laborExpense / ctx.revenue) * 100).toFixed(1)}% of revenue (target 29.0%). The increase is driven by transit windshield time between scattered job sites and Friday emergency overtime runs.`,
        facts: [
          `Field labor expense is $${ctx.laborExpense.toLocaleString()} (${((ctx.laborExpense / ctx.revenue) * 100).toFixed(1)}% of revenue).`,
          `Overtime hours represent 17.8% of total field payroll.`,
          `Average daily windshield drive time per technician is 1 hour 45 minutes.`
        ],
        calculations: [
          `Overtime hourly rate is 1.5x burdened wage ($58/hr standard = $87/hr overtime).`,
          `17.8% overtime vs 5.0% benchmark represents ~$36,400 in preventable wage premiums.`
        ],
        estimates: [
          `Reclaiming 40 minutes of windshield time per tech per day through geo-clustering unlocks 2.5 billable hours/tech/week.`,
          `Annualized profit impact of route compression: $42,000.`
        ],
        hypotheses: [
          `Customer service dispatchers are booking calls in chronological arrival order rather than scheduling geographically adjacent appointments.`,
          `Technicians are lingering at the supply house in the morning rather than carrying standardized van truck stock.`
        ],
        recommendedActions: [
          `Implement morning truck stock replenish bins so technicians depart dispatch at 7:45 AM sharp without supply house stops.`,
          `Group maintenance calls into tight geographic zip code clusters.`
        ]
      };
    }

    // 5. "What should I work on this week?"
    return {
      summary: `Your top priority this week is cutting $650/mo of unused software, enacting the diagnostic fee adjustment to $109, and capping Friday dispatch overtime.`,
      facts: [
        `You have 5 active profit leaks identified, totaling $118,500 in annual leakage.`,
        `Two recurring software tools (FleetPro Legacy and ReviewBoost) have had zero active logins in 90 days.`,
        `Direct labor is currently 37.4% of revenue vs. 29.0% benchmark.`
      ],
      calculations: [
        `Canceling the 2 unused SaaS tools immediately secures $7,800/yr in recurring savings with zero operational risk.`,
        `Adjusting diagnostic pricing recovers ~$800/month starting next week.`
      ],
      estimates: [
        `Immediate focus on these 3 actions will recapture approximately $4,200 in monthly net profit within 30 days.`,
        `Implementation difficulty: Low (requires < 4 hours of total executive time).`
      ],
      hypotheses: [
        `Quick wins on software and pricing will build operational momentum before tackling route dispatch restructuring.`
      ],
      recommendedActions: [
        `Action 1 (Today): Log into billing portal and cancel FleetPro Legacy & ReviewBoost subscriptions.`,
        `Action 2 (Tomorrow): Update diagnostic dispatch charge to $109 in your dispatch price book.`,
        `Action 3 (Friday): Set 3:30 PM cutoff for non-critical dispatch to prevent overtime overrun.`
      ]
    };
  }
}
