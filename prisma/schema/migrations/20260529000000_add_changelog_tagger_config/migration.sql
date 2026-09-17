-- Add changelog-tagger service configuration to SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "changelogTaggerUrl" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "changelogTaggerApiKey" TEXT;
