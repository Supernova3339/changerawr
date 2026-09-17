-- Add scheduledAt field to existing ChangelogEntry table
ALTER TABLE "ChangelogEntry" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- Add indexes for efficient querying of scheduled entries
CREATE INDEX "ChangelogEntry_scheduledAt_idx" ON "ChangelogEntry"("scheduledAt");
CREATE INDEX "ChangelogEntry_scheduled_published_idx" ON "ChangelogEntry"("scheduledAt", "publishedAt");

-- Create ScheduledJobType enum
CREATE TYPE "ScheduledJobType" AS ENUM ('PUBLISH_CHANGELOG_ENTRY', 'UNPUBLISH_CHANGELOG_ENTRY', 'DELETE_CHANGELOG_ENTRY', 'SEND_EMAIL_NOTIFICATION');

-- Create JobStatus enum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Create ScheduledJob table for background job management
CREATE TABLE "ScheduledJob" (
                                "id" TEXT NOT NULL,
                                "type" "ScheduledJobType" NOT NULL,
                                "entityId" TEXT NOT NULL,
                                "scheduledAt" TIMESTAMP(3) NOT NULL,
                                "executedAt" TIMESTAMP(3),
                                "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
                                "errorMessage" TEXT,
                                "retryCount" INTEGER NOT NULL DEFAULT 0,
                                "maxRetries" INTEGER NOT NULL DEFAULT 3,
                                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                "updatedAt" TIMESTAMP(3) NOT NULL,

                                CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ScheduledJob table
CREATE INDEX "ScheduledJob_type_idx" ON "ScheduledJob"("type");
CREATE INDEX "ScheduledJob_entityId_idx" ON "ScheduledJob"("entityId");
CREATE INDEX "ScheduledJob_scheduledAt_idx" ON "ScheduledJob"("scheduledAt");
CREATE INDEX "ScheduledJob_status_idx" ON "ScheduledJob"("status");
CREATE INDEX "ScheduledJob_scheduled_pending_idx" ON "ScheduledJob"("scheduledAt", "status");

-- Add foreign key constraint from ScheduledJob to ChangelogEntry
-- Note: This is optional since we use entityId as a generic reference
-- ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;