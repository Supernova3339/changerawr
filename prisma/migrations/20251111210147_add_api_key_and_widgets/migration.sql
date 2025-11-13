-- DropIndex
DROP INDEX IF EXISTS "ScheduledJob_changelogEntryId_idx";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "ChangelogEntry" ADD COLUMN     "excerpt" TEXT;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "adminOnlyApiKeyCreation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "customCSS" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Widget_projectId_idx" ON "Widget"("projectId");

-- CreateIndex
CREATE INDEX "Widget_projectId_isActive_idx" ON "Widget"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
