-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "isScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);
