-- Add Slack signing secret to SystemConfig
-- Used for verifying Slack API requests

ALTER TABLE "SystemConfig" ADD COLUMN "slackSigningSecret" TEXT;

-- Add comment to document the field
COMMENT ON COLUMN "SystemConfig"."slackSigningSecret" IS 'Slack app signing secret (encrypted) - used to verify webhook requests from Slack API';