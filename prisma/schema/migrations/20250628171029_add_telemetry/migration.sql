/*
  Warnings:

  - A unique constraint covering the columns `[telemetryInstanceId]` on the table `SystemConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TelemetryState" AS ENUM ('PROMPT', 'ENABLED', 'DISABLED');

-- AlterEnum
ALTER TYPE "ScheduledJobType" ADD VALUE 'TELEMETRY_SEND';

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "allowTelemetry" "TelemetryState" NOT NULL DEFAULT 'PROMPT',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "telemetryInstanceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_telemetryInstanceId_key" ON "SystemConfig"("telemetryInstanceId");
