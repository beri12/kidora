-- Phone-first authentication.
--
-- 1. Email becomes optional: an account can now be created from a verified
--    phone number alone, so there is no email address to store.
-- 2. `phone` holds the number in E.164 form (+251911223344) and is unique.
-- 3. `roleConfirmed` is false until the user answers "How will you use
--    Kidora?", which lets the web app route new sign-ups to the role step.
-- 4. `facebookId` / `tiktokId` mirror the existing `googleId` column so the
--    same find-or-create path works for every social provider.

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
-- IF NOT EXISTS throughout: an earlier migration on another branch
-- (20260905120000_add_user_phone) already adds `phone` and `phoneVerified`,
-- and the two were written in parallel. This way the column set is the same
-- whichever of them ran first, and a half-applied run can simply be redeployed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebookId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiktokId" TEXT;

-- Existing accounts were all created through an email/password or social
-- flow where the role was picked explicitly, so they are already confirmed.
UPDATE "User" SET "roleConfirmed" = true;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_facebookId_key" ON "User"("facebookId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_tiktokId_key" ON "User"("tiktokId");
