-- AlterTable: Add timezone configuration to SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "SystemConfig" ADD COLUMN "allowUserTimezone" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add per-user timezone override to Settings
ALTER TABLE "Settings" ADD COLUMN "timezone" TEXT;
