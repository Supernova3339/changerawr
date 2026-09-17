-- Add configurable AI provider URL for custom/local LLM support
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "aiApiUrl" TEXT;
