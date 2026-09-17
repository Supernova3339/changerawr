-- CreateTable
CREATE TABLE "PublicChangelogAnalytics"
(
    "id"               TEXT         NOT NULL,
    "projectId"        TEXT         NOT NULL,
    "changelogEntryId" TEXT,
    "ipHash"           TEXT         NOT NULL,
    "country"          TEXT,
    "userAgent"        TEXT,
    "referrer"         TEXT,
    "viewedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionHash"      TEXT         NOT NULL,

    CONSTRAINT "PublicChangelogAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_projectId_idx" ON "PublicChangelogAnalytics" ("projectId");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_changelogEntryId_idx" ON "PublicChangelogAnalytics" ("changelogEntryId");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_viewedAt_idx" ON "PublicChangelogAnalytics" ("viewedAt");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_country_idx" ON "PublicChangelogAnalytics" ("country");

-- CreateIndex
CREATE INDEX "PublicChangelogAnalytics_sessionHash_idx" ON "PublicChangelogAnalytics" ("sessionHash");

-- AddForeignKey
ALTER TABLE "PublicChangelogAnalytics"
    ADD CONSTRAINT "PublicChangelogAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChangelogAnalytics"
    ADD CONSTRAINT "PublicChangelogAnalytics_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE;