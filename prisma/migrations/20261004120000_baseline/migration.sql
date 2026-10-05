-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'HVAC',
    "employeeCount" INTEGER NOT NULL DEFAULT 9,
    "approxAnnualRevenue" REAL NOT NULL DEFAULT 1420000,
    "location" TEXT NOT NULL DEFAULT 'Columbus, OH',
    "primaryServices" TEXT NOT NULL,
    "avgJobValue" REAL NOT NULL DEFAULT 1390,
    "jobsPerMonth" INTEGER NOT NULL DEFAULT 85,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "revenue" REAL NOT NULL,
    "totalExpenses" REAL NOT NULL,
    "cogs" REAL NOT NULL,
    "laborExpense" REAL NOT NULL,
    "materialExpense" REAL NOT NULL,
    "marketingExpense" REAL NOT NULL,
    "vehicleExpense" REAL NOT NULL,
    "overheadExpense" REAL NOT NULL,
    "softwareExpense" REAL NOT NULL,
    "discountsGiven" REAL NOT NULL DEFAULT 0,
    "refunds" REAL NOT NULL DEFAULT 0,
    "grossProfit" REAL NOT NULL,
    "netProfit" REAL NOT NULL,
    "netMargin" REAL NOT NULL,
    "jobsCompleted" INTEGER NOT NULL,
    "averageJobValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialPeriod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "invoiceAmount" REAL NOT NULL,
    "laborCost" REAL NOT NULL,
    "laborHours" REAL NOT NULL,
    "materialCost" REAL NOT NULL,
    "marginPercent" REAL NOT NULL,
    "technicianName" TEXT NOT NULL,
    "isCallback" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfitLeak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "financialImpactAnnual" REAL NOT NULL,
    "financialImpactMonthly" REAL NOT NULL,
    "confidence" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "recommendedInvestigation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfitLeak_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currentSituation" TEXT NOT NULL,
    "proposedImprovement" TEXT NOT NULL,
    "monthlyImpact" REAL NOT NULL,
    "annualImpact" REAL NOT NULL,
    "confidence" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoneyFoundItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estimatedAnnualImpact" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POTENTIAL',
    "overlapGroup" TEXT,
    "assumptions" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MoneyFoundItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "leakId" TEXT,
    "opportunityId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "supportingEvidence" TEXT NOT NULL,
    "expectedImpactMonthly" REAL NOT NULL,
    "expectedImpactAnnual" REAL NOT NULL,
    "difficulty" TEXT NOT NULL,
    "costToImplement" REAL NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL,
    "responsiblePerson" TEXT NOT NULL DEFAULT 'Business Owner',
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_leakId_fkey" FOREIGN KEY ("leakId") REFERENCES "ProfitLeak" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "problemDetected" TEXT NOT NULL,
    "recommendationSummary" TEXT NOT NULL,
    "evidenceSnapshot" TEXT NOT NULL,
    "decisionTaken" TEXT NOT NULL,
    "decisionNotes" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedOutcome" TEXT NOT NULL,
    "actualOutcome" TEXT,
    "timeUntilResultDays" INTEGER,
    "financialImpactActual" REAL,
    "outcomeAssessment" TEXT NOT NULL DEFAULT 'PENDING',
    "learnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DecisionRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecisionRecord_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "lastSyncAt" DATETIME,
    "syncFrequency" TEXT NOT NULL DEFAULT 'Nightly',
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "credentialsConfigured" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "recordsImported" INTEGER NOT NULL,
    "warnings" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
