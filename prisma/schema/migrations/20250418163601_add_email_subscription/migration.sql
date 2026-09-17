-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY');

-- CreateTable
CREATE TABLE "EmailSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubscription" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'ALL_UPDATES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_unsubscribeToken_key" ON "EmailSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "EmailSubscriber_email_idx" ON "EmailSubscriber"("email");

-- CreateIndex
CREATE INDEX "EmailSubscriber_unsubscribeToken_idx" ON "EmailSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_email_key" ON "EmailSubscriber"("email");

-- CreateIndex
CREATE INDEX "ProjectSubscription_projectId_idx" ON "ProjectSubscription"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSubscription_subscriberId_idx" ON "ProjectSubscription"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSubscription_projectId_subscriberId_key" ON "ProjectSubscription"("projectId", "subscriberId");

-- AddForeignKey
ALTER TABLE "ProjectSubscription" ADD CONSTRAINT "ProjectSubscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubscription" ADD CONSTRAINT "ProjectSubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
