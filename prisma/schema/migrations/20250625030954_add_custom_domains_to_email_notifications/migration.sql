-- AlterTable
ALTER TABLE "ProjectSubscription" ADD COLUMN customDomain VARCHAR(255);

-- CreateIndex
CREATE INDEX idx_project_subscriptions_custom_domain ON "ProjectSubscription"(customDomain);
