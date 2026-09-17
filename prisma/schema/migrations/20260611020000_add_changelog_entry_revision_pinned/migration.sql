-- AlterTable
ALTER TABLE "ChangelogEntryRevision" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ChangelogEntryRevision_entryId_pinned_createdAt_idx" ON "ChangelogEntryRevision"("entryId", "pinned", "createdAt");
