-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "allowAutoPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT true;
