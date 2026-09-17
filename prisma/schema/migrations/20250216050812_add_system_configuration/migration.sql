-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultInvitationExpiry" INTEGER NOT NULL DEFAULT 7,
    "requireApprovalForChangelogs" BOOLEAN NOT NULL DEFAULT true,
    "maxChangelogEntriesPerProject" INTEGER NOT NULL DEFAULT 100,
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
