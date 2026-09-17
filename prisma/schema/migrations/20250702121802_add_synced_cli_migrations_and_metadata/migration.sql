-- CreateTable
CREATE TABLE "ProjectSyncMetadata" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastSyncHash" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "totalCommitsSynced" INTEGER NOT NULL DEFAULT 0,
    "repositoryUrl" TEXT,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSyncMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedCommit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "commitMessage" TEXT NOT NULL,
    "commitAuthor" TEXT NOT NULL,
    "commitEmail" TEXT NOT NULL,
    "commitDate" TIMESTAMP(3) NOT NULL,
    "commitFiles" TEXT[],
    "conventionalType" TEXT,
    "conventionalScope" TEXT,
    "isBreaking" BOOLEAN NOT NULL DEFAULT false,
    "commitBody" TEXT,
    "commitFooter" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branch" TEXT NOT NULL DEFAULT 'main',

    CONSTRAINT "SyncedCommit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSyncMetadata_projectId_key" ON "ProjectSyncMetadata"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSyncMetadata_projectId_idx" ON "ProjectSyncMetadata"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSyncMetadata_lastSyncedAt_idx" ON "ProjectSyncMetadata"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "SyncedCommit_projectId_idx" ON "SyncedCommit"("projectId");

-- CreateIndex
CREATE INDEX "SyncedCommit_commitHash_idx" ON "SyncedCommit"("commitHash");

-- CreateIndex
CREATE INDEX "SyncedCommit_syncedAt_idx" ON "SyncedCommit"("syncedAt");

-- CreateIndex
CREATE INDEX "SyncedCommit_conventionalType_idx" ON "SyncedCommit"("conventionalType");

-- CreateIndex
CREATE INDEX "SyncedCommit_branch_idx" ON "SyncedCommit"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedCommit_projectId_commitHash_key" ON "SyncedCommit"("projectId", "commitHash");

-- AddForeignKey
ALTER TABLE "ProjectSyncMetadata" ADD CONSTRAINT "ProjectSyncMetadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedCommit" ADD CONSTRAINT "SyncedCommit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
