-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "languageToolEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languageToolApiUrl" TEXT DEFAULT 'https://api.languagetool.org/v2',
ADD COLUMN     "languageToolApiKey" TEXT,
ADD COLUMN     "languageToolLanguage" TEXT DEFAULT 'en-US';
