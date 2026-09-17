DO $$
    BEGIN
        -- Add TELEMETRY_SEND to ScheduledJobType enum (with conditional check)
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
                              JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'ScheduledJobType' AND e.enumlabel = 'TELEMETRY_SEND'
        ) THEN
            ALTER TYPE "ScheduledJobType" ADD VALUE 'TELEMETRY_SEND';
        END IF;
    END $$;

-- Add TelemetryState enum (with conditional check)
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TelemetryState') THEN
            CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');
        END IF;
    END $$;

-- Add telemetry fields to SystemConfig table (with conditional checks)
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

-- Create unique constraint on telemetryInstanceId (with conditional check)
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SystemConfig_telemetryInstanceId_key') THEN
            CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");
        END IF;
    END $$;

-- Remove foreign key constraint from ScheduledJob to allow generic entityIds (already conditional)
ALTER TABLE "ScheduledJob" DROP CONSTRAINT IF EXISTS "ScheduledJob_entityId_fkey";