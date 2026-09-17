-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "slackOAuthClientId" TEXT,
ADD COLUMN     "slackOAuthClientSecret" TEXT,
ADD COLUMN     "slackOAuthEnabled" BOOLEAN NOT NULL DEFAULT false;
