-- Create CliAuthCode table
CREATE TABLE "CliAuthCode" (
                               "id" TEXT NOT NULL,
                               "code" TEXT NOT NULL,
                               "userId" TEXT NOT NULL,
                               "callbackUrl" TEXT NOT NULL,
                               "expiresAt" TIMESTAMP(3) NOT NULL,
                               "usedAt" TIMESTAMP(3),
                               "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT "CliAuthCode_pkey" PRIMARY KEY ("id")
);

-- Create indexes for CliAuthCode
CREATE UNIQUE INDEX "CliAuthCode_code_key" ON "CliAuthCode"("code");
CREATE INDEX "CliAuthCode_code_idx" ON "CliAuthCode"("code");
CREATE INDEX "CliAuthCode_userId_idx" ON "CliAuthCode"("userId");
CREATE INDEX "CliAuthCode_expiresAt_idx" ON "CliAuthCode"("expiresAt");

-- Add foreign key constraint for CliAuthCode
ALTER TABLE "CliAuthCode" ADD CONSTRAINT "CliAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The changelogEntryId column should exist from migration 20250628230000
-- But let's add the foreign key constraint that was removed in the telemetry fixes
-- Only add it if both the column exists AND the constraint doesn't exist
DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ScheduledJob' AND column_name = 'changelogEntryId'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ScheduledJob_changelogEntryId_fkey'
        ) THEN
            ALTER TABLE "ScheduledJob"
                ADD CONSTRAINT "ScheduledJob_changelogEntryId_fkey"
                    FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id")
                        ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END $$;