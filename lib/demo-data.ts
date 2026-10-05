/**
 * DEMO DATA — NOT REAL BUSINESS INFORMATION
 * Realistic fictional baseline for "Apex Comfort Solutions", an HVAC service contractor.
 */

export const DEMO_BUSINESS = {
  id: 'biz_apex_hvac_demo',
  name: 'Apex Comfort Solutions',
  industry: 'HVAC',
  employeeCount: 9, // 5 field techs, 2 helpers, 1 dispatcher, 1 owner
  approxAnnualRevenue: 1420000,
  location: 'Columbus, OH (Franklin County)',
  primaryServices: 'AC Installation, Heat Pump Replacement, Furnace Tune-ups, Emergency Service, Duct Sealing',
  avgJobValue: 1390,
  jobsPerMonth: 85,
  notes: 'Residential and light commercial HVAC specialist. Growing rapidly over past 3 years but owner noticed margins tightening despite higher top-line sales.'
};

export const DEMO_FINANCIALS = {
  revenue: 1420000,
  expenses: 1297800,
  grossProfit: 588200,
  netProfit: 122200,
  netMargin: 8.6, // constrained vs healthy 14-16% benchmark
  averageJobValue: 1392,
  jobsCompleted: 1020,
  laborExpense: 531080,   // 37.4% (Leak #1: benchmark is 29%)
  materialExpense: 300720, // 21.2% (Leak #2: material cost creep)
  marketingExpense: 98400, // 6.9% (Leak #3: broad search ads burning budget)
  vehicleExpense: 72600,   // 5.1%
  overheadExpense: 261800, // 18.4%
  softwareExpense: 17400,  // 1.2% (Leak #4: duplicate unused tools)
  discountsGiven: 18200,   // (Leak #5: discretionary tech discounts)
  refunds: 4800,
  cogs: 831800
};

export const DEMO_MONTHLY_TRENDS = [
  { month: 'Oct', revenue: 104000, expenses: 95000, netProfit: 9000, margin: 8.6, laborPct: 37.1 },
  { month: 'Nov', revenue: 112000, expenses: 102000, netProfit: 10000, margin: 8.9, laborPct: 36.8 },
  { month: 'Dec', revenue: 135000, expenses: 124000, netProfit: 11000, margin: 8.1, laborPct: 38.5 },
  { month: 'Jan', revenue: 142000, expenses: 131000, netProfit: 11000, margin: 7.7, laborPct: 39.2 },
  { month: 'Feb', revenue: 118000, expenses: 108000, netProfit: 10000, margin: 8.5, laborPct: 37.4 },
  { month: 'Mar', revenue: 98000,  expenses: 91000,  netProfit: 7000,  margin: 7.1, laborPct: 38.0 },
  { month: 'Apr', revenue: 105000, expenses: 96000,  netProfit: 9000,  margin: 8.6, laborPct: 36.5 },
  { month: 'May', revenue: 122000, expenses: 110000, netProfit: 12000, margin: 9.8, laborPct: 35.8 },
  { month: 'Jun', revenue: 138000, expenses: 125000, netProfit: 13000, margin: 9.4, laborPct: 37.0 },
  { month: 'Jul', revenue: 146000, expenses: 132000, netProfit: 14000, margin: 9.6, laborPct: 37.5 },
  { month: 'Aug', revenue: 154000, expenses: 140000, netProfit: 14000, margin: 9.1, laborPct: 37.8 },
  { month: 'Sep', revenue: 146000, expenses: 133800, netProfit: 12200, margin: 8.4, laborPct: 37.4 }
];

export const DEMO_PROFIT_LEAKS = [
  {
    id: 'leak_labor_ot',
    title: 'Elevated Field Labor & Unbilled Overtime Drag',
    category: 'LABOR',
    description: 'Field labor accounts for 37.4% of total revenue (8.4% above the 29.0% contractor benchmark). Friday emergency dispatch overruns and unoptimized inter-county travel drive 17.8% overtime ratios.',
    financialImpactAnnual: 42000,
    financialImpactMonthly: 3500,
    confidence: 'HIGH',
    severity: 'CRITICAL',
    evidence: JSON.stringify([
      { metricName: 'Direct Labor % of Revenue', currentValue: '37.4%', benchmarkValue: '29.0%', variancePercent: 8.4 },
      { metricName: 'Overtime Hours Ratio', currentValue: '17.8%', benchmarkValue: '< 6.0%', variancePercent: 11.8 },
      { metricName: 'Daily Unbillable Transit / Tech', currentValue: '105 mins', benchmarkValue: '55 mins' }
    ]),
    recommendedInvestigation: 'Audit technician timecards for Friday afternoon overtime vs. scheduled booking density. Review GPS transit hours between consecutive dispatch zones.',
    status: 'ACTIVE'
  },
  {
    id: 'leak_materials_creep',
    title: 'Equipment & Refrigerant Supplier Inflation Not Reflected in Quotes',
    category: 'MATERIALS',
    description: 'Material cost is 21.2% of revenue. Over the past 9 months, wholesale prices on 3-ton heat pumps, copper line sets, and 410A refrigerant rose 14.2%, but system flat-rate replacement quotes were not updated.',
    financialImpactAnnual: 28500,
    financialImpactMonthly: 2375,
    confidence: 'HIGH',
    severity: 'CRITICAL',
    evidence: JSON.stringify([
      { metricName: 'Material Cost %', currentValue: '21.2%', benchmarkValue: '18.5%', variancePercent: 2.7 },
      { metricName: 'Supplier Cost Creep vs Pricing', currentValue: '+14.2%', benchmarkValue: '0.0%' }
    ]),
    recommendedInvestigation: 'Cross-reference supplier invoice line-items for condensers and line sets against current billing catalog markup tiers.',
    status: 'ACTIVE'
  },
  {
    id: 'leak_marketing_waste',
    title: 'Ad Spend Misallocation on Low-Intent Search Campaigns',
    category: 'MARKETING',
    description: 'Broad Google Search campaigns consume $1,800/month with an average Customer Acquisition Cost (CAC) of $310—exceeding the target $120 CAC—while generating high proportions of non-serviceable warranty inquiries.',
    financialImpactAnnual: 18400,
    financialImpactMonthly: 1533,
    confidence: 'HIGH',
    severity: 'WARNING',
    evidence: JSON.stringify([
      { metricName: 'Search Ads CAC', currentValue: '$310', benchmarkValue: '$120', variancePercent: 158.3 },
      { metricName: 'Lead to Booked Job Rate', currentValue: '18.8%', benchmarkValue: '48.0%' }
    ]),
    recommendedInvestigation: 'Inspect Google Ads search term reports to identify negative keywords. Shift $1,200/mo into Google Guaranteed Local Services Ads.',
    status: 'ACTIVE'
  },
  {
    id: 'leak_software_ghost',
    title: 'Redundant & Unused Dispatch/Marketing Software Tools',
    category: 'SOFTWARE',
    description: 'Two recurring subscription charges ($450/month and $200/month) remain active for a legacy fleet tracking tool and an abandoned review booster that was replaced 6 months ago.',
    financialImpactAnnual: 5400,
    financialImpactMonthly: 450,
    confidence: 'HIGH',
    severity: 'WARNING',
    evidence: JSON.stringify([
      { metricName: 'Unused Monthly Recurring SaaS Charges', currentValue: '$650/mo', benchmarkValue: '$0/mo' },
      { metricName: 'Active User Logins (Last 90 Days)', currentValue: '0', benchmarkValue: 'N/A' }
    ]),
    recommendedInvestigation: 'Confirm cancellation terms and billing portal credentials for FleetPro Legacy and ReviewBoost.',
    status: 'ACTIVE'
  },
  {
    id: 'leak_callbacks_rework',
    title: 'High 30-Day Installation Callback Rate Eroding Margins',
    category: 'OPERATIONS',
    description: 'Callback rate within 30 days is running at 7.8% (target < 3.0%). Unbilled return trips to adjust refrigerant charges or fix loose condensate drain lines cost ~$340 per truck roll.',
    financialImpactAnnual: 14200,
    financialImpactMonthly: 1183,
    confidence: 'MEDIUM',
    severity: 'WARNING',
    evidence: JSON.stringify([
      { metricName: '30-Day Callback Rate', currentValue: '7.8%', benchmarkValue: '< 3.0%' },
      { metricName: 'Avg Unbilled Cost / Callback', currentValue: '$340', benchmarkValue: '$0' }
    ]),
    recommendedInvestigation: 'Institute pre-departure startup commissioning checklists requiring photo verification of vacuum decay and static pressure.',
    status: 'ACTIVE'
  },
  {
    id: 'leak_discretionary_discounts',
    title: 'Unstandardized Field Discounts Given Without Approval',
    category: 'PRICING',
    description: 'Technicians applied $18,200 in courtesy discounts on quotes without manager sign-off to close deals faster, eroding unit profitability.',
    financialImpactAnnual: 10400,
    financialImpactMonthly: 866,
    confidence: 'MEDIUM',
    severity: 'WARNING',
    evidence: JSON.stringify([
      { metricName: 'Discretionary Discounts Given', currentValue: '$18,200', benchmarkValue: '< $6,000' }
    ]),
    recommendedInvestigation: 'Set discount approval limits in field software capping technician courtesy discounts at $50 without dispatcher authorization.',
    status: 'ACTIVE'
  }
];

export const DEMO_OPPORTUNITIES = [
  {
    id: 'opp_pricing_adj',
    title: 'Selective 6% Flat-Rate Price Adjustment',
    category: 'PRICING',
    currentSituation: 'Standard diagnostic fees are $89 (Columbus median is $109–$129) and replacement margins are 32.5% despite supplier cost hikes.',
    proposedImprovement: 'Increase diagnostic trip charges from $89 to $109 (credited toward approved repairs) and adjust equipment flat rates by 6%.',
    monthlyImpact: 2600,
    annualImpact: 31200,
    confidence: 'HIGH',
    evidence: 'Columbus HVAC pricing study shows competitor median diagnostic fee is $115. A 6% adjustment on 1,020 annual jobs with 15% elasticity buffer yields substantial margin recovery.',
    assumptions: 'Assumes 95%+ close rate retention when diagnostic fee is credited toward repair work.',
    overlapGroup: 'PRICING_RECOVERY',
    status: 'ACTIVE'
  },
  {
    id: 'opp_route_density',
    title: 'Dynamic Zone Dispatching to Reclaim 2.5 Billable Hours/Tech/Week',
    category: 'OPERATIONS',
    currentSituation: 'Technicians spend an average of 1 hr 45 min per day in transit due to booking calls across town without geographic batching.',
    proposedImprovement: 'Cluster morning appointments in North Columbus zip codes and afternoon calls in East Columbus.',
    monthlyImpact: 3500,
    annualImpact: 42000,
    confidence: 'MEDIUM',
    evidence: 'GPS telematics shows 105 daily minutes in transit. Zoned scheduling compresses transit to 65 minutes, creating 2.5 additional billable hours per technician per week.',
    assumptions: '5 field technicians working 50 active weeks; 60% of recovered transit converted to billable service or diagnostic revenue.',
    overlapGroup: 'LABOR_EFFICIENCY',
    status: 'ACTIVE'
  },
  {
    id: 'opp_lsa_marketing',
    title: 'Reallocate $1,200/mo from Broad Search to Google Local Services Ads',
    category: 'MARKETING',
    currentSituation: '$1,800/mo spent on broad Google Search producing leads at $310 CAC vs $110 CAC on Google Guaranteed LSAs.',
    proposedImprovement: 'Shift $1,200/month of search spend directly to Google Guaranteed Local Services Ads.',
    monthlyImpact: 1200,
    annualImpact: 14400,
    confidence: 'HIGH',
    evidence: '90-day conversion tracking shows LSA leads convert to booked jobs at 52% vs 19% for broad search clicks.',
    assumptions: 'Maintains current total marketing budget; shifts to pay-per-booked-call model with zero charges for invalid inquiries.',
    overlapGroup: 'MARKETING_OPTIMIZATION',
    status: 'ACTIVE'
  },
  {
    id: 'opp_vip_memberships',
    title: 'Expand VIP Club Maintenance Agreements to 28% Customer Penetration',
    category: 'CUSTOMER_RETENTION',
    currentSituation: 'Only 14% of completed service call customers are enrolled in annual maintenance program ($19/mo or $219/yr).',
    proposedImprovement: 'Implement $25 technician enrollment spiff and credit membership fee toward same-day repairs to reach 28% penetration.',
    monthlyImpact: 2383,
    annualImpact: 28600,
    confidence: 'MEDIUM',
    evidence: 'Contractors with >30% club penetration report 40% higher shoulder-season job volume and 2.4x higher customer lifetime value.',
    assumptions: 'Generates 15 new net monthly memberships @ $19/mo recurring + higher equipment replacement win rates.',
    overlapGroup: 'MEMBERSHIP_MRR',
    status: 'ACTIVE'
  },
  {
    id: 'opp_cancel_ghost_saas',
    title: 'Decommission Redundant Legacy Fleet and Review Software',
    category: 'SOFTWARE',
    currentSituation: 'Company pays $650/month across two legacy software platforms with zero user activity in 90 days.',
    proposedImprovement: 'Immediately cancel FleetPro Legacy ($450/mo) and ReviewBoost ($200/mo).',
    monthlyImpact: 450,
    annualImpact: 5400,
    confidence: 'HIGH',
    evidence: 'Billing statements confirm recurring card charges; existing primary CRM already provides fleet GPS and SMS review requests.',
    assumptions: 'Zero business impact; redundant capability already included in main CRM.',
    overlapGroup: 'OVERHEAD_REDUCTION',
    status: 'ACTIVE'
  }
];

import { MoneyFoundStatus } from './types';

export const DEMO_MONEY_FOUND_ITEMS: Array<{
  id: string;
  title: string;
  category: string;
  estimatedAnnualImpact: number;
  status: MoneyFoundStatus;
  overlapGroup?: string;
  assumptions: string;
  notes?: string;
}> = [
  {
    id: 'mf_pricing',
    title: 'Flat-Rate Diagnostic & System Pricing Adjustment',
    category: 'PRICING',
    estimatedAnnualImpact: 31200,
    status: 'VALIDATED',
    overlapGroup: 'PRICING_RECOVERY',
    assumptions: '6% average price increase on quotes, maintaining 95%+ close rate with repair credit.',
    notes: 'Owner validated with service manager; ready for price book update.'
  },
  {
    id: 'mf_labor_ot',
    title: 'Dispatch Zone Clustering & Friday Overtime Curtailment',
    category: 'LABOR',
    estimatedAnnualImpact: 42000,
    status: 'POTENTIAL',
    overlapGroup: 'LABOR_EFFICIENCY',
    assumptions: '2.5 billable hours recovered per technician per week via route clustering.',
    notes: 'Dispatcher meeting scheduled for Tuesday morning.'
  },
  {
    id: 'mf_marketing_lsa',
    title: 'Google Ads Reallocation to Local Services Ads',
    category: 'MARKETING',
    estimatedAnnualImpact: 14400,
    status: 'POTENTIAL',
    overlapGroup: 'MARKETING_OPTIMIZATION',
    assumptions: 'Shift $1,200/mo spend to Google Guaranteed with $110 CAC.',
    notes: 'Awaiting agency contract review.'
  },
  {
    id: 'mf_software_prune',
    title: 'Cancel Redundant Legacy Software (FleetPro & ReviewBoost)',
    category: 'SOFTWARE',
    estimatedAnnualImpact: 5400,
    status: 'IMPLEMENTED',
    overlapGroup: 'OVERHEAD_REDUCTION',
    assumptions: 'Cancels $450/mo FleetPro + $200/mo ReviewBoost subscriptions.',
    notes: 'Cancelled with vendor; final billing cycle ends this month.'
  },
  {
    id: 'mf_materials_renego',
    title: 'Supplier Tier Bulk Rebate on Copper & Heat Pumps',
    category: 'MATERIALS',
    estimatedAnnualImpact: 14200,
    status: 'REALIZED',
    overlapGroup: 'SUPPLIER_REBATES',
    assumptions: 'Negotiated 4% annual volume rebate with Carrier distributor.',
    notes: 'Rebate agreement executed 90 days ago; first quarter check received ($3,550).'
  }
];

export const DEMO_RECOMMENDATIONS = [
  {
    id: 'rec_software_cancel',
    leakId: 'leak_software_ghost',
    opportunityId: 'opp_cancel_ghost_saas',
    action: 'Cancel FleetPro Legacy ($450/mo) and ReviewBoost ($200/mo) subscriptions today.',
    reason: 'Both software tools are 100% redundant with your primary CRM features and have recorded zero team logins over the past 90 days.',
    supportingEvidence: 'Billing statements show $650/mo recurring spend. Audit of access logs shows zero active technician or office sessions.',
    expectedImpactMonthly: 650,
    expectedImpactAnnual: 7800,
    difficulty: 'EASY',
    costToImplement: 0,
    priority: 'HIGH',
    responsiblePerson: 'Office Manager / Owner',
    status: 'IN_PROGRESS'
  },
  {
    id: 'rec_pricing_diag',
    leakId: 'leak_materials_creep',
    opportunityId: 'opp_pricing_adj',
    action: 'Increase diagnostic trip fee from $89 to $109 and apply 6% flat-rate markup to equipment replacements.',
    reason: 'Recovers $31,200 in net margin lost to supplier price increases over the past 9 months without losing customer quote win rates.',
    supportingEvidence: 'Competitor median diagnostic fee in Columbus is $115. Wholesale equipment costs are up 14.2% since January.',
    expectedImpactMonthly: 2600,
    expectedImpactAnnual: 31200,
    difficulty: 'EASY',
    costToImplement: 0,
    priority: 'HIGH',
    responsiblePerson: 'Business Owner',
    status: 'PROPOSED'
  },
  {
    id: 'rec_dispatch_zones',
    leakId: 'leak_labor_ot',
    opportunityId: 'opp_route_density',
    action: 'Implement North/East geographic cluster scheduling and institute a 3:30 PM cutoff for non-critical dispatch on Fridays.',
    reason: 'Direct field labor is running at 37.4% due to windshield drive time and Friday emergency double-time wages.',
    supportingEvidence: 'Technicians average 105 daily transit minutes. Overtime accounts for 17.8% of field payroll.',
    expectedImpactMonthly: 3500,
    expectedImpactAnnual: 42000,
    difficulty: 'MEDIUM',
    costToImplement: 250,
    priority: 'URGENT',
    responsiblePerson: 'Head Dispatcher',
    status: 'PROPOSED'
  },
  {
    id: 'rec_marketing_realloc',
    leakId: 'leak_marketing_waste',
    opportunityId: 'opp_lsa_marketing',
    action: 'Pause Broad Search Campaign B ($1,200/mo) and reallocate budget into Google Local Services Ads.',
    reason: 'Campaign B yields $310 CAC with low job close rates, whereas Google Guaranteed LSAs produce booked jobs at $110 CAC.',
    supportingEvidence: 'Last 90 days: LSA produced 28 booked calls at 52% close rate; Campaign B produced 11 calls with 5 outside service area.',
    expectedImpactMonthly: 1200,
    expectedImpactAnnual: 14400,
    difficulty: 'EASY',
    costToImplement: 0,
    priority: 'MEDIUM',
    responsiblePerson: 'Marketing Lead',
    status: 'PROPOSED'
  }
];

export const DEMO_DECISION_RECORDS = [
  {
    id: 'dec_rebate_carrier',
    recommendationId: null,
    problemDetected: 'Rising equipment supplier costs eroding install margins',
    recommendationSummary: 'Negotiate volume rebate tier with primary Carrier equipment distributor',
    evidenceSnapshot: JSON.stringify({
      materialCostPercent: 21.2,
      annualEquipmentSpend: 245000,
      targetRebatePercent: 4.0
    }),
    decisionTaken: 'ACCEPTED',
    decisionNotes: 'Met with Carrier distributor rep; committed to 80% primary brand exclusivity in exchange for 4% quarterly cash rebate.',
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 90 days ago
    expectedOutcome: 'Recover 4% on annual equipment purchases (~$14,200/year)',
    actualOutcome: 'Received first quarterly rebate check of $3,550 on schedule; supplier also provided 2 free technician certification classes.',
    timeUntilResultDays: 75,
    financialImpactActual: 14200,
    outcomeAssessment: 'SUCCESS',
    learnings: 'When annual equipment purchases exceed $200k, equipment distributors will readily grant 3-5% volume rebates in exchange for brand exclusivity commitments.'
  },
  {
    id: 'dec_cancel_fleet_saas',
    recommendationId: 'rec_software_cancel',
    problemDetected: 'Duplicate unused fleet and review software charges ($650/mo)',
    recommendationSummary: 'Cancel FleetPro Legacy and ReviewBoost subscriptions',
    evidenceSnapshot: JSON.stringify({
      monthlySpend: 650,
      activeLogins90Days: 0,
      alternativeTool: 'Integrated ServiceTitan GPS'
    }),
    decisionTaken: 'ACCEPTED',
    decisionNotes: 'Logged into billing portal and submitted 30-day cancellation notice. Exported legacy vehicle service histories.',
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    expectedOutcome: 'Save $7,800 annually with zero disruption.',
    actualOutcome: 'FleetPro confirmed cancellation effective end of month. First $450 bill already eliminated.',
    timeUntilResultDays: 14,
    financialImpactActual: 5400,
    outcomeAssessment: 'SUCCESS',
    learnings: 'Service contractors accumulate an average of 1.8 zombie SaaS subscriptions per year when upgrading CRM or dispatch systems. Routine quarterly software audits quickly recover $5k-$10k in pure cash flow.'
  },
  {
    id: 'dec_tuneup_groupon_reject',
    recommendationId: null,
    problemDetected: 'Shoulder season volume dip in October and April',
    recommendationSummary: 'Run discounted $49 Groupon tune-up promotion to generate leads',
    evidenceSnapshot: JSON.stringify({
      offerPrice: 49,
      directLaborCost: 65,
      expectedMargin: -16
    }),
    decisionTaken: 'REJECTED',
    decisionNotes: 'Rejected because historical contractor data shows Groupon shoppers have < 4% repair conversion and high warranty complaints, leading to negative contribution margins.',
    decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
    expectedOutcome: 'Avoid negative cash flow work and technician morale drop.',
    actualOutcome: 'Protected technician hours for profitable maintenance club members instead of unprofitable $49 deal hunters.',
    timeUntilResultDays: 30,
    financialImpactActual: 8200,
    outcomeAssessment: 'SUCCESS',
    learnings: 'Discount deal site promotions for HVAC produce negative gross margins and tie up technician capacity that should be reserved for high-margin repairs.'
  }
];

export const DEMO_INTEGRATIONS = [
  {
    id: 'int_qbo',
    provider: 'QUICKBOOKS',
    name: 'QuickBooks Online',
    category: 'ACCOUNTING',
    status: 'CONNECTED',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hrs ago
    syncFrequency: 'Nightly',
    recordsSynced: 1248,
    credentialsConfigured: true,
    notes: 'General Ledger, Chart of Accounts, and P&L synched cleanly.'
  },
  {
    id: 'int_servicetitan',
    provider: 'SERVICETITAN',
    name: 'ServiceTitan',
    category: 'CRM',
    status: 'CONNECTED',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    syncFrequency: 'Hourly',
    recordsSynced: 890,
    credentialsConfigured: true,
    notes: 'Pulling completed jobs, technician drive times, and ticket invoices.'
  },
  {
    id: 'int_stripe',
    provider: 'STRIPE',
    name: 'Stripe Merchant Processing',
    category: 'PAYMENTS',
    status: 'CONNECTED',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 15),
    syncFrequency: 'Real-time Webhooks',
    recordsSynced: 342,
    credentialsConfigured: true,
    notes: 'Card processing fees and customer invoice payment velocity.'
  },
  {
    id: 'int_gusto',
    provider: 'GUSTO',
    name: 'Gusto Payroll',
    category: 'PAYROLL',
    status: 'CONNECTED',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    syncFrequency: 'Bi-weekly',
    recordsSynced: 18,
    credentialsConfigured: true,
    notes: 'Burdened payroll rates, employer taxes, and technician overtime hours.'
  },
  {
    id: 'int_google_ads',
    provider: 'GOOGLE_ADS',
    name: 'Google Ads & Local Services',
    category: 'MARKETING',
    status: 'CONNECTED',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    syncFrequency: 'Daily',
    recordsSynced: 156,
    credentialsConfigured: true,
    notes: 'Ad spend, cost per lead, and Google Guaranteed phone call attribution.'
  }
];
