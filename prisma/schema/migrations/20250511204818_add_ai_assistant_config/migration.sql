-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "aiApiKey" TEXT,
ADD COLUMN     "aiApiProvider" TEXT DEFAULT 'secton',
ADD COLUMN     "aiDefaultModel" TEXT DEFAULT 'copilot-zero',
ADD COLUMN     "enableAIAssistant" BOOLEAN NOT NULL DEFAULT false;
