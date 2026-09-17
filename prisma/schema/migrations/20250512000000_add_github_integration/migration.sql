-- CreateTable
CREATE TABLE "GitHubIntegration" (
                                     "id" TEXT NOT NULL,
                                     "projectId" TEXT NOT NULL,
                                     "repositoryUrl" TEXT NOT NULL,
                                     "accessToken" TEXT NOT NULL,
                                     "defaultBranch" TEXT NOT NULL DEFAULT 'main',
                                     "lastSyncAt" TIMESTAMP(3),
                                     "lastCommitSha" TEXT,
                                     "includeBreakingChanges" BOOLEAN NOT NULL DEFAULT true,
                                     "includeFixes" BOOLEAN NOT NULL DEFAULT true,
                                     "includeFeatures" BOOLEAN NOT NULL DEFAULT true,
                                     "includeChores" BOOLEAN NOT NULL DEFAULT false,
                                     "customCommitTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
                                     "enabled" BOOLEAN NOT NULL DEFAULT true,
                                     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     "updatedAt" TIMESTAMP(3) NOT NULL,

                                     CONSTRAINT "GitHubIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubIntegration_projectId_key" ON "GitHubIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitHubIntegration_projectId_idx" ON "GitHubIntegration"("projectId");

-- CreateIndex
CREATE INDEX "GitHubIntegration_enabled_idx" ON "GitHubIntegration"("enabled");

-- AddForeignKey
ALTER TABLE "GitHubIntegration" ADD CONSTRAINT "GitHubIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;