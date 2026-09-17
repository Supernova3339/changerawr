-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('DELETE_ENTRY', 'DELETE_TAG');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "changelogId" TEXT NOT NULL,

    CONSTRAINT "ChangelogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogRequest" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "staffId" TEXT NOT NULL,
    "adminId" TEXT,
    "changelogEntryId" TEXT,
    "changelogTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChangelogEntryToChangelogTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChangelogEntryToChangelogTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Changelog_projectId_key" ON "Changelog"("projectId");

-- CreateIndex
CREATE INDEX "ChangelogEntry_changelogId_idx" ON "ChangelogEntry"("changelogId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogTag_name_key" ON "ChangelogTag"("name");

-- CreateIndex
CREATE INDEX "ChangelogRequest_staffId_idx" ON "ChangelogRequest"("staffId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_adminId_idx" ON "ChangelogRequest"("adminId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_changelogEntryId_idx" ON "ChangelogRequest"("changelogEntryId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_changelogTagId_idx" ON "ChangelogRequest"("changelogTagId");

-- CreateIndex
CREATE INDEX "_ChangelogEntryToChangelogTag_B_index" ON "_ChangelogEntryToChangelogTag"("B");

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntry" ADD CONSTRAINT "ChangelogEntry_changelogId_fkey" FOREIGN KEY ("changelogId") REFERENCES "Changelog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_changelogTagId_fkey" FOREIGN KEY ("changelogTagId") REFERENCES "ChangelogTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangelogEntryToChangelogTag" ADD CONSTRAINT "_ChangelogEntryToChangelogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangelogEntryToChangelogTag" ADD CONSTRAINT "_ChangelogEntryToChangelogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "ChangelogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
