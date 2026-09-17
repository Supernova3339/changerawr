-- This migration runs BEFORE 20250628180800_add_telemetry_support to prevent failures
-- It makes all the changes that the problematic migration attempts, but with proper conditional logic

DO $$
    BEGIN
        -- 1. Add TELEMETRY_SEND to ScheduledJobType enum if it doesn't exist
        -- This prevents the ALTER TYPE ADD VALUE from failing if it already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
                              JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'ScheduledJobType' AND e.enumlabel = 'TELEMETRY_SEND'
        ) THEN
            ALTER TYPE "ScheduledJobType" ADD VALUE 'TELEMETRY_SEND';
        END IF;

        -- 2. Create TelemetryState enum if it doesn't exist
        -- This prevents the CREATE TYPE from failing if it already exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TelemetryState') THEN
            CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');
        END IF;

        -- 3. Add telemetry columns to SystemConfig if they don't exist
        -- This prevents the ALTER TABLE ADD COLUMN from failing if columns exist
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

        -- 4. Create unique index if it doesn't exist
        -- This prevents the CREATE UNIQUE INDEX from failing if it already exists
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SystemConfig_telemetryInstanceId_key') THEN
            CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");
        END IF;

        -- 5. Remove foreign key constraint if it exists
        -- This prevents issues with the DROP CONSTRAINT IF EXISTS
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledJob_entityId_fkey') THEN
            ALTER TABLE "ScheduledJob" DROP CONSTRAINT "ScheduledJob_entityId_fkey";
        END IF;

        -- 6. Clean up any problematic columns that might exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ScheduledJob' AND column_name = 'changelogEntryId'
        ) THEN
            ALTER TABLE "ScheduledJob" DROP COLUMN "changelogEntryId";
        END IF;
    END $$;