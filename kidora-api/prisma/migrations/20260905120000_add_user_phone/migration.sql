-- Adds phone as a second login identity (SMS sign-in, phone verification).
--
-- Written to be safe to re-run. A migration that is interrupted part-way —
-- Ctrl-C, a dropped connection, a laptop sleeping — is recorded as failed and
-- blocks every later migration until it is resolved. With IF NOT EXISTS the
-- recovery is the same regardless of how much of it landed: mark it rolled
-- back and deploy again.

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
