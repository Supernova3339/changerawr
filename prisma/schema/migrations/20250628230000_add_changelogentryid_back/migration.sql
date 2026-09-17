-- Migration: Add changelogEntryId column back to ScheduledJob without forced relations

-- Add changelogEntryId column back to ScheduledJob table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ScheduledJob' AND column_name = 'changelogEntryId'
    ) THEN
ALTER TABLE "ScheduledJob" ADD COLUMN "changelogEntryId" TEXT;
END IF;
END $$;

-- Create index on changelogEntryId for better query performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ScheduledJob_changelogEntryId_idx') THEN
CREATE INDEX "ScheduledJob_changelogEntryId_idx" ON "ScheduledJob"("changelogEntryId");
END IF;
END $$;

-- Note: We intentionally DO NOT add a foreign key constraint to keep this as a flexible reference