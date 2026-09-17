-- CreateTable
CREATE TABLE "TwoFactorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TwoFactorMode" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFactorSession_userId_idx" ON "TwoFactorSession"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorSession_expiresAt_idx" ON "TwoFactorSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "TwoFactorSession" ADD CONSTRAINT "TwoFactorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
