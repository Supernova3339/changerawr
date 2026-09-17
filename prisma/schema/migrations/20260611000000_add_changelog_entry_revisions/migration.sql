-- CreateTable
CREATE TABLE "ChangelogEntryRevision" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "version" TEXT,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesRemoved" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "reason" TEXT NOT NULL,
    "restoredFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangelogEntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangelogEntryRevision_entryId_idx" ON "ChangelogEntryRevision"("entryId");

-- CreateIndex
CREATE INDEX "ChangelogEntryRevision_entryId_createdAt_idx" ON "ChangelogEntryRevision"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChangelogEntryRevision" ADD CONSTRAINT "ChangelogEntryRevision_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntryRevision" ADD CONSTRAINT "ChangelogEntryRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
