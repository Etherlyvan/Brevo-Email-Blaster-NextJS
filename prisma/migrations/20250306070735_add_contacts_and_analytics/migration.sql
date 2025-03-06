/*
  Warnings:

  - Added the required column `updatedAt` to the `Recipient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "batchSize" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastProcessedAt" TIMESTAMP(3),
ADD COLUMN     "nextBatchIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SmtpConfig" ADD COLUMN     "lastQuotaReset" TIMESTAMP(3),
ADD COLUMN     "usedToday" INTEGER NOT NULL DEFAULT 0;
