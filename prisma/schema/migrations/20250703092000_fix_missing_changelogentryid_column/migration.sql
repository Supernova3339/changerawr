-- Migration: 20250703092000_fix_missing_changelogentryid_column
-- Adds the missing changelogEntryId column that should have been created by 20250628230000_add_changelogentryid_back

-- Add the missing changelogEntryId column to ScheduledJob table if it doesn't exist
ALTER TABLE "ScheduledJob" ADD COLUMN IF NOT EXISTS "changelogEntryId" TEXT;

-- Create index on changelogEntryId if it doesn't exist
CREATE INDEX IF NOT EXISTS "ScheduledJob_changelogEntryId_idx" ON "ScheduledJob"("changelogEntryId");

-- Add foreign key constraint (ignore error if it already exists)
DO $$
    BEGIN
        BEGIN
            ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END $$;