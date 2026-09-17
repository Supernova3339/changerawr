-- Migration: Fix telemetry enum casting issues
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

-- 3. Remove foreign key constraint from ScheduledJob if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledJob_entityId_fkey') THEN
ALTER TABLE "ScheduledJob" DROP CONSTRAINT "ScheduledJob_entityId_fkey";
END IF;
END $$;

-- 4. Remove any remaining changelogEntryId column from ScheduledJob if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ScheduledJob' AND column_name = 'changelogEntryId'
    ) THEN
ALTER TABLE "ScheduledJob" DROP COLUMN "changelogEntryId";
END IF;
END $$;

-- 5. Add telemetry columns to SystemConfig with proper enum casting
DO $$
BEGIN
    -- Add allowTelemetry column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SystemConfig' AND column_name = 'allowTelemetry'
    ) THEN
ALTER TABLE "SystemConfig" ADD COLUMN "allowTelemetry" "TelemetryState" NOT NULL DEFAULT 'PROMPT'::"TelemetryState";
END IF;

    -- Add telemetryInstanceId column if it doesn't exist
IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'SystemConfig' AND column_name = 'telemetryInstanceId'
    ) THEN
ALTER TABLE "SystemConfig" ADD COLUMN "telemetryInstanceId" TEXT;
END IF;
END $$;

-- 6. Create unique index on telemetryInstanceId if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SystemConfig_telemetryInstanceId_key') THEN
CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");
END IF;
END $$;

-- 7. Ensure existing SystemConfig records have proper telemetry values
DO $$
BEGIN
    -- Update any existing records that might have null or invalid telemetry states
    IF EXISTS (SELECT 1 FROM "SystemConfig" WHERE "allowTelemetry" IS NULL) THEN
UPDATE "SystemConfig" SET "allowTelemetry" = 'PROMPT'::"TelemetryState" WHERE "allowTelemetry" IS NULL;
END IF;
END $$;