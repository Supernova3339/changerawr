-- A large batch of pre-existing, untracked schema drift: schema.prisma had
-- gained SAML SSO, custom-domain ACME/SSL certificate management, the
-- extension store system, OAuth email-domain restrictions, and panel IP
-- whitelisting, none of which ever got a matching migration written. This
-- migration is Prisma's own computed diff (via
-- `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema --script`)
-- between the live database and the current schema, applied verbatim.
-- Discovered while chasing an unrelated seed-script failure (missing
-- Settings.languageTool* columns, included below) — this predates that.
-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING_HTTP01', 'PENDING_DNS01', 'ISSUED', 'EXPIRED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('HTTP01', 'DNS01');

-- CreateEnum
CREATE TYPE "SslMode" AS ENUM ('LETS_ENCRYPT', 'EXTERNAL', 'NONE');

-- CreateEnum
CREATE TYPE "BrowserRuleType" AS ENUM ('BLOCK', 'ALLOW');

-- CreateEnum
CREATE TYPE "ExtensionSourceType" AS ENUM ('STORE', 'CUSTOM', 'BUILTIN');

-- AlterEnum
ALTER TYPE "ScheduledJobType" ADD VALUE 'RENEW_SSL_CERTIFICATE';

-- AlterTable
ALTER TABLE "OAuthProvider" ADD COLUMN     "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "blockExistingUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredClaims" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "languageToolApiKey" TEXT,
ADD COLUMN     "languageToolApiUrl" TEXT,
ADD COLUMN     "languageToolLanguage" TEXT,
ADD COLUMN     "languageToolLevel" TEXT DEFAULT 'default',
ADD COLUMN     "languageToolMotherTongue" TEXT,
ADD COLUMN     "languageToolUsername" TEXT;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "languageToolAllowUserOverride" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "languageToolUsername" TEXT,
ADD COLUMN     "panelIpWhitelist" TEXT[],
ADD COLUMN     "panelIpWhitelistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "custom_domains" ADD COLUMN     "forceHttps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sslMode" "SslMode" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "extension_stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_extensions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isLinked" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "ExtensionSourceType" NOT NULL DEFAULT 'STORE',
    "storeId" TEXT,
    "sourceUrl" TEXT,
    "latestVersion" TEXT,
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "editor_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainCertificate" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL,
    "challengeType" "ChallengeType" NOT NULL,
    "privateKeyPem" TEXT NOT NULL,
    "certificatePem" TEXT,
    "fullChainPem" TEXT,
    "csrPem" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acmeOrderUrl" TEXT,
    "challengeToken" TEXT,
    "challengeKeyAuth" TEXT,
    "dnsTxtValue" TEXT,
    "lastError" TEXT,
    "renewalAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainBrowserRule" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "userAgentPattern" TEXT NOT NULL,
    "ruleType" "BrowserRuleType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainBrowserRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainThrottleConfig" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requestsPerSecond" INTEGER NOT NULL DEFAULT 60,
    "burstSize" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainThrottleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcmeAccount" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "accountKeyPem" TEXT NOT NULL,
    "accountUrl" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcmeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAMLProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ssoUrl" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "spEntityId" TEXT,
    "nameIdFormat" TEXT NOT NULL DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    "emailAttribute" TEXT NOT NULL DEFAULT 'email',
    "nameAttribute" TEXT NOT NULL DEFAULT 'name',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockExistingUsers" BOOLEAN NOT NULL DEFAULT false,
    "requiredClaims" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAMLProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAMLConnection" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "sessionIndex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAMLConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extension_stores_name_key" ON "extension_stores"("name");

-- CreateIndex
CREATE INDEX "extension_stores_isEnabled_idx" ON "extension_stores"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "editor_extensions_name_key" ON "editor_extensions"("name");

-- CreateIndex
CREATE INDEX "editor_extensions_name_idx" ON "editor_extensions"("name");

-- CreateIndex
CREATE INDEX "editor_extensions_isEnabled_idx" ON "editor_extensions"("isEnabled");

-- CreateIndex
CREATE INDEX "editor_extensions_storeId_idx" ON "editor_extensions"("storeId");

-- CreateIndex
CREATE INDEX "editor_extensions_isLinked_idx" ON "editor_extensions"("isLinked");

-- CreateIndex
CREATE INDEX "DomainCertificate_domainId_idx" ON "DomainCertificate"("domainId");

-- CreateIndex
CREATE INDEX "DomainCertificate_status_idx" ON "DomainCertificate"("status");

-- CreateIndex
CREATE INDEX "DomainCertificate_expiresAt_idx" ON "DomainCertificate"("expiresAt");

-- CreateIndex
CREATE INDEX "DomainCertificate_domainId_status_idx" ON "DomainCertificate"("domainId", "status");

-- CreateIndex
CREATE INDEX "DomainCertificate_challengeToken_idx" ON "DomainCertificate"("challengeToken");

-- CreateIndex
CREATE INDEX "DomainBrowserRule_domainId_isEnabled_idx" ON "DomainBrowserRule"("domainId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "DomainThrottleConfig_domainId_key" ON "DomainThrottleConfig"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLProvider_name_key" ON "SAMLProvider"("name");

-- CreateIndex
CREATE INDEX "SAMLConnection_userId_idx" ON "SAMLConnection"("userId");

-- CreateIndex
CREATE INDEX "SAMLConnection_providerId_idx" ON "SAMLConnection"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLConnection_providerId_userId_key" ON "SAMLConnection"("providerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SAMLConnection_providerId_nameId_key" ON "SAMLConnection"("providerId", "nameId");

-- AddForeignKey
ALTER TABLE "editor_extensions" ADD CONSTRAINT "editor_extensions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "extension_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainCertificate" ADD CONSTRAINT "DomainCertificate_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainBrowserRule" ADD CONSTRAINT "DomainBrowserRule_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainThrottleConfig" ADD CONSTRAINT "DomainThrottleConfig_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAMLConnection" ADD CONSTRAINT "SAMLConnection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "SAMLProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAMLConnection" ADD CONSTRAINT "SAMLConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

