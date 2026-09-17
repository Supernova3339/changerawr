-- CreateEnum
CREATE TYPE "TwoFactorMode" AS ENUM ('NONE', 'PASSKEY_PLUS_PASSWORD', 'PASSWORD_PLUS_PASSKEY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorMode" "TwoFactorMode" DEFAULT 'NONE';
