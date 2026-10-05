-- CreateTable
CREATE TABLE "OAuthState" (
    "stateHash" TEXT NOT NULL PRIMARY KEY,
    "environment" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QboConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "accessTokenExpiresAt" DATETIME NOT NULL,
    "refreshTokenExpiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "lastSuccessfulSyncAt" DATETIME,
    "lastSyncStatus" TEXT NOT NULL DEFAULT 'NEVER',
    "lastSyncErrorCode" TEXT,
    "lastRecordsCreated" INTEGER NOT NULL DEFAULT 0,
    "lastRecordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "lastRecordsRejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QboSyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "historicalStart" DATETIME NOT NULL,
    "historicalEnd" DATETIME NOT NULL,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsRejected" INTEGER NOT NULL DEFAULT 0,
    "checkpoint" TEXT NOT NULL DEFAULT '{}',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "QboSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QboConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QboSourceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "lastUpdatedAt" DATETIME,
    "transactionDate" DATETIME,
    "amountMinor" BIGINT,
    "currency" TEXT,
    "rawCiphertext" TEXT NOT NULL,
    "sourceDigest" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QboSourceRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QboConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QboSourceRecord_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "QboSyncRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'HVAC',
    "employeeCount" INTEGER,
    "approxAnnualRevenue" REAL,
    "location" TEXT NOT NULL DEFAULT '',
    "primaryServices" TEXT NOT NULL,
    "avgJobValue" REAL,
    "jobsPerMonth" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BusinessProfile" ("approxAnnualRevenue", "avgJobValue", "createdAt", "employeeCount", "id", "industry", "jobsPerMonth", "location", "name", "notes", "primaryServices", "updatedAt") SELECT "approxAnnualRevenue", "avgJobValue", "createdAt", "employeeCount", "id", "industry", "jobsPerMonth", "location", "name", "notes", "primaryServices", "updatedAt" FROM "BusinessProfile";
DROP TABLE "BusinessProfile";
ALTER TABLE "new_BusinessProfile" RENAME TO "BusinessProfile";
CREATE TABLE "new_Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastSyncAt" DATETIME,
    "syncFrequency" TEXT NOT NULL DEFAULT 'Nightly',
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "credentialsConfigured" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Integration" ("businessId", "category", "createdAt", "credentialsConfigured", "id", "lastSyncAt", "name", "notes", "provider", "recordsSynced", "status", "syncFrequency", "updatedAt") SELECT "businessId", "category", "createdAt", "credentialsConfigured", "id", "lastSyncAt", "name", "notes", "provider", "recordsSynced", "status", "syncFrequency", "updatedAt" FROM "Integration";
DROP TABLE "Integration";
ALTER TABLE "new_Integration" RENAME TO "Integration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QboConnection_businessId_key" ON "QboConnection"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "QboConnection_realmId_key" ON "QboConnection"("realmId");

-- CreateIndex
CREATE INDEX "QboConnection_status_lastAttemptAt_idx" ON "QboConnection"("status", "lastAttemptAt");

-- CreateIndex
CREATE INDEX "QboSyncRun_connectionId_startedAt_idx" ON "QboSyncRun"("connectionId", "startedAt");

-- CreateIndex
CREATE INDEX "QboSyncRun_status_startedAt_idx" ON "QboSyncRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "QboSourceRecord_connectionId_entityName_transactionDate_idx" ON "QboSourceRecord"("connectionId", "entityName", "transactionDate");

-- CreateIndex
CREATE INDEX "QboSourceRecord_syncRunId_idx" ON "QboSourceRecord"("syncRunId");

-- CreateIndex
CREATE INDEX "QboSourceRecord_sourceDigest_idx" ON "QboSourceRecord"("sourceDigest");

-- CreateIndex
CREATE UNIQUE INDEX "QboSourceRecord_connectionId_entityName_providerRecordId_key" ON "QboSourceRecord"("connectionId", "entityName", "providerRecordId");
