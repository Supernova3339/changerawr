-- Make staffId nullable in ChangelogRequest (if not already)
ALTER TABLE "ChangelogRequest" ALTER COLUMN "staffId" DROP NOT NULL;

-- Update AuditLog foreign key constraints to SET NULL on delete
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update targetUserId constraint to SET NULL on delete
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_targetUserId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update ChangelogRequest staffId foreign key constraint to SET NULL on delete
ALTER TABLE "ChangelogRequest" DROP CONSTRAINT IF EXISTS "ChangelogRequest_staffId_fkey";
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update ChangelogRequest adminId constraint to SET NULL on delete (should already be correct)
ALTER TABLE "ChangelogRequest" DROP CONSTRAINT IF EXISTS "ChangelogRequest_adminId_fkey";
ALTER TABLE "ChangelogRequest" ADD CONSTRAINT "ChangelogRequest_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;