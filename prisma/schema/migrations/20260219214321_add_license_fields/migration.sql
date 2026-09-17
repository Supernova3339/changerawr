-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "sponsorLastVerified" TIMESTAMP(3),
ADD COLUMN     "sponsorLicenseKey" TEXT,
ADD COLUMN     "sponsorLicenseValid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sponsorPayload" TEXT,
ADD COLUMN     "sponsorProof" TEXT;
