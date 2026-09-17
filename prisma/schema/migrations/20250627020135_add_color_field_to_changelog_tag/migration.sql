/*
  Warnings:

  - You are about to drop the column `customdomain` on the `ProjectSubscription` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "RequestType" ADD VALUE 'ALLOW_SCHEDULE';

-- DropIndex
DROP INDEX "idx_project_subscriptions_custom_domain";

-- AlterTable
ALTER TABLE "ChangelogTag" ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "ProjectSubscription" DROP COLUMN "customdomain",
ADD COLUMN     "customDomain" TEXT;

-- CreateIndex
CREATE INDEX "ProjectSubscription_customDomain_idx" ON "ProjectSubscription"("customDomain");

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ChangelogEntry_scheduled_published_idx" RENAME TO "ChangelogEntry_scheduledAt_publishedAt_idx";

-- RenameIndex
ALTER INDEX "ScheduledJob_scheduled_pending_idx" RENAME TO "ScheduledJob_scheduledAt_status_idx";
