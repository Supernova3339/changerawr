-- Migration: Complete telemetry fix - removes old relation and adds telemetry support
-- 1. Add TELEMETRY_SEND to ScheduledJobType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ScheduledJobType' AND e.enumlabel = 'TELEMETRY_SEND'
    ) THEN
ALTER TYPE "ScheduledJobType" ADD VALUE 'TELEMETRY_SEND';
END IF;
END $$;

-- 2. Create TelemetryState enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TelemetryState') THEN
CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');
END IF;
END $$;

-- 3. Add telemetry columns to SystemConfig if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SystemConfig' AND column_name = 'allowTelemetry'
    ) THEN
ALTER TABLE "SystemConfig" ADD COLUMN "allowTelemetry" "TelemetryState" NOT NULL DEFAULT 'PROMPT';
END IF;

IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SystemConfig' AND column_name = 'telemetryInstanceId'
    ) THEN
ALTER TABLE "SystemConfig" ADD COLUMN "telemetryInstanceId" TEXT;
END IF;
END $$;

-- 4. Create unique index on telemetryInstanceId if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SystemConfig_telemetryInstanceId_key') THEN
CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");
END IF;
END $$;

-- 5. Remove foreign key constraint from ScheduledJob if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledJob_entityId_fkey') THEN
ALTER TABLE "ScheduledJob" DROP CONSTRAINT "ScheduledJob_entityId_fkey";
END IF;
END $$;

-- 6. Remove any remaining changelogEntryId column from ScheduledJob if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ScheduledJob' AND column_name = 'changelogEntryId'
    ) THEN
ALTER TABLE "ScheduledJob" DROP COLUMN "changelogEntryId";
END IF;
END $$;