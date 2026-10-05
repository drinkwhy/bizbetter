import { PrismaClient } from '@prisma/client';
import {
  DEMO_BUSINESS,
  DEMO_FINANCIALS,
  DEMO_PROFIT_LEAKS,
  DEMO_OPPORTUNITIES,
  DEMO_MONEY_FOUND_ITEMS,
  DEMO_RECOMMENDATIONS,
  DEMO_DECISION_RECORDS,
  DEMO_INTEGRATIONS
} from '../lib/demo-data';

if (process.env.BIZBETTER_DEMO_MODE !== 'true' || !/demo(?:\.db)?(?:$|\?)/i.test(process.env.DATABASE_URL || '')) { throw new Error('Demo seeding requires BIZBETTER_DEMO_MODE=true and a separate demo database URL.'); }
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BizBetter with Apex Comfort Solutions demo dataset...');

  // 1. Upsert Business Profile
  const business = await prisma.businessProfile.upsert({
    where: { id: DEMO_BUSINESS.id },
    update: {
      name: DEMO_BUSINESS.name,
      industry: DEMO_BUSINESS.industry,
      employeeCount: DEMO_BUSINESS.employeeCount,
      approxAnnualRevenue: DEMO_BUSINESS.approxAnnualRevenue,
      location: DEMO_BUSINESS.location,
      primaryServices: DEMO_BUSINESS.primaryServices,
      avgJobValue: DEMO_BUSINESS.avgJobValue,
      jobsPerMonth: DEMO_BUSINESS.jobsPerMonth,
      notes: DEMO_BUSINESS.notes
    },
    create: {
      id: DEMO_BUSINESS.id,
      name: DEMO_BUSINESS.name,
      industry: DEMO_BUSINESS.industry,
      employeeCount: DEMO_BUSINESS.employeeCount,
      approxAnnualRevenue: DEMO_BUSINESS.approxAnnualRevenue,
      location: DEMO_BUSINESS.location,
      primaryServices: DEMO_BUSINESS.primaryServices,
      avgJobValue: DEMO_BUSINESS.avgJobValue,
      jobsPerMonth: DEMO_BUSINESS.jobsPerMonth,
      notes: DEMO_BUSINESS.notes
    }
  });

  // 2. Financial Period
  await prisma.financialPeriod.deleteMany({ where: { businessId: business.id } });
  await prisma.financialPeriod.create({
    data: {
      businessId: business.id,
      periodName: '2024-Trailing-12M',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2024-09-30'),
      revenue: DEMO_FINANCIALS.revenue,
      totalExpenses: DEMO_FINANCIALS.expenses,
      cogs: DEMO_FINANCIALS.cogs,
      laborExpense: DEMO_FINANCIALS.laborExpense,
      materialExpense: DEMO_FINANCIALS.materialExpense,
      marketingExpense: DEMO_FINANCIALS.marketingExpense,
      vehicleExpense: DEMO_FINANCIALS.vehicleExpense,
      overheadExpense: DEMO_FINANCIALS.overheadExpense,
      softwareExpense: DEMO_FINANCIALS.softwareExpense,
      discountsGiven: DEMO_FINANCIALS.discountsGiven,
      refunds: DEMO_FINANCIALS.refunds,
      grossProfit: DEMO_FINANCIALS.grossProfit,
      netProfit: DEMO_FINANCIALS.netProfit,
      netMargin: DEMO_FINANCIALS.netMargin,
      jobsCompleted: DEMO_FINANCIALS.jobsCompleted,
      averageJobValue: DEMO_FINANCIALS.averageJobValue
    }
  });

  // 3. Profit Leaks
  await prisma.profitLeak.deleteMany({ where: { businessId: business.id } });
  for (const leak of DEMO_PROFIT_LEAKS) {
    await prisma.profitLeak.create({
      data: {
        id: leak.id,
        businessId: business.id,
        title: leak.title,
        category: leak.category,
        description: leak.description,
        evidence: leak.evidence,
        financialImpactAnnual: leak.financialImpactAnnual,
        financialImpactMonthly: leak.financialImpactMonthly,
        confidence: leak.confidence,
        severity: leak.severity,
        recommendedInvestigation: leak.recommendedInvestigation,
        status: leak.status
      }
    });
  }

  // 4. Opportunities
  await prisma.opportunity.deleteMany({ where: { businessId: business.id } });
  for (const opp of DEMO_OPPORTUNITIES) {
    await prisma.opportunity.create({
      data: {
        id: opp.id,
        businessId: business.id,
        title: opp.title,
        category: opp.category,
        currentSituation: opp.currentSituation,
        proposedImprovement: opp.proposedImprovement,
        monthlyImpact: opp.monthlyImpact,
        annualImpact: opp.annualImpact,
        confidence: opp.confidence,
        evidence: opp.evidence,
        assumptions: opp.assumptions,
        status: opp.status
      }
    });
  }

  // 5. Money Found Items
  await prisma.moneyFoundItem.deleteMany({ where: { businessId: business.id } });
  for (const item of DEMO_MONEY_FOUND_ITEMS) {
    await prisma.moneyFoundItem.create({
      data: {
        id: item.id,
        businessId: business.id,
        title: item.title,
        category: item.category,
        estimatedAnnualImpact: item.estimatedAnnualImpact,
        status: item.status,
        overlapGroup: item.overlapGroup,
        assumptions: item.assumptions,
        notes: item.notes
      }
    });
  }

  // 6. Recommendations
  await prisma.recommendation.deleteMany({ where: { businessId: business.id } });
  for (const rec of DEMO_RECOMMENDATIONS) {
    await prisma.recommendation.create({
      data: {
        id: rec.id,
        businessId: business.id,
        leakId: rec.leakId,
        opportunityId: rec.opportunityId,
        action: rec.action,
        reason: rec.reason,
        supportingEvidence: rec.supportingEvidence,
        expectedImpactMonthly: rec.expectedImpactMonthly,
        expectedImpactAnnual: rec.expectedImpactAnnual,
        difficulty: rec.difficulty,
        costToImplement: rec.costToImplement,
        priority: rec.priority,
        responsiblePerson: rec.responsiblePerson,
        status: rec.status
      }
    });
  }

  // 7. Decision Records
  await prisma.decisionRecord.deleteMany({ where: { businessId: business.id } });
  for (const dec of DEMO_DECISION_RECORDS) {
    await prisma.decisionRecord.create({
      data: {
        id: dec.id,
        businessId: business.id,
        recommendationId: dec.recommendationId,
        problemDetected: dec.problemDetected,
        recommendationSummary: dec.recommendationSummary,
        evidenceSnapshot: dec.evidenceSnapshot,
        decisionTaken: dec.decisionTaken,
        decisionNotes: dec.decisionNotes,
        decidedAt: dec.decidedAt,
        expectedOutcome: dec.expectedOutcome,
        actualOutcome: dec.actualOutcome,
        timeUntilResultDays: dec.timeUntilResultDays,
        financialImpactActual: dec.financialImpactActual,
        outcomeAssessment: dec.outcomeAssessment,
        learnings: dec.learnings
      }
    });
  }

  // 8. Integrations
  await prisma.integration.deleteMany({ where: { businessId: business.id } });
  for (const int of DEMO_INTEGRATIONS) {
    await prisma.integration.create({
      data: {
        id: int.id,
        businessId: business.id,
        provider: int.provider,
        name: int.name,
        category: int.category,
        status: int.status,
        lastSyncAt: int.lastSyncAt,
        syncFrequency: int.syncFrequency,
        recordsSynced: int.recordsSynced,
        credentialsConfigured: int.credentialsConfigured,
        notes: int.notes
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
