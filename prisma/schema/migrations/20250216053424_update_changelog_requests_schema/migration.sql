/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ChangelogRequest` table. All the data in the column will be lost.
  - The `status` column on the `ChangelogRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `projectId` to the `ChangelogRequest` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `ChangelogRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "ChangelogRequest_changelogEntryId_idx";

-- DropIndex
DROP INDEX "ChangelogRequest_changelogTagId_idx";

-- AlterTable
ALTER TABLE "ChangelogRequest" DROP COLUMN "updatedAt",
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ChangelogRequest_projectId_idx" ON "ChangelogRequest"("projectId");

-- CreateIndex
CREATE INDEX "ChangelogRequest_status_idx" ON "ChangelogRequest"("status");

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
