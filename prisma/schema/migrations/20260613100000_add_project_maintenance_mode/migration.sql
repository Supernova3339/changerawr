-- AlterTable
ALTER TABLE "Project" ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "maintenanceMessage" TEXT;
