-- Every other User relation cascades on delete (see 20250610120000_fix_user_deletion_constraints).
-- ApiKey was missed: it still RESTRICTs, so deleting a user with any API key
-- fails with a foreign key violation (surfaced by prisma/seed.ts's cleanup step).
ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_userId_fkey";
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
