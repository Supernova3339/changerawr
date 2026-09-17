-- CreateTable
CREATE TABLE "PasswordReset" (
                                 "id" TEXT NOT NULL,
                                 "token" TEXT NOT NULL,
                                 "userId" TEXT NOT NULL,
                                 "email" TEXT NOT NULL,
                                 "expiresAt" TIMESTAMP(3) NOT NULL,
                                 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "usedAt" TIMESTAMP(3),

                                 CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX "PasswordReset_email_idx" ON "PasswordReset"("email");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN "enablePasswordReset" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "SystemConfig" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "smtpPassword" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "smtpSecure" BOOLEAN;
ALTER TABLE "SystemConfig" ADD COLUMN "systemEmail" TEXT;