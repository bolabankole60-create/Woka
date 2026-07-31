-- Add idempotency tracking for sync operations
-- Prevents duplicate customer mutations when the same operation ID is retried

CREATE TABLE "ProcessedOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "serverVersion" INTEGER NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedOperation_operationId_artisanId_key" UNIQUE("operationId", "artisanId")
);

CREATE INDEX "ProcessedOperation_artisanId_idx" ON "ProcessedOperation"("artisanId");
CREATE INDEX "ProcessedOperation_entityId_idx" ON "ProcessedOperation"("entityId");
CREATE INDEX "ProcessedOperation_createdAt_idx" ON "ProcessedOperation"("createdAt");
