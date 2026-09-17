-- DropForeignKey
ALTER TABLE "ChangelogRequest" DROP CONSTRAINT "ChangelogRequest_projectId_fkey";

-- AddForeignKey
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
