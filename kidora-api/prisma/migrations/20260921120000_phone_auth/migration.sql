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
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "roleConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "facebookId" TEXT;
ALTER TABLE "User" ADD COLUMN "tiktokId" TEXT;

-- Existing accounts were all created through an email/password or social
-- flow where the role was picked explicitly, so they are already confirmed.
UPDATE "User" SET "roleConfirmed" = true;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_facebookId_key" ON "User"("facebookId");
CREATE UNIQUE INDEX "User_tiktokId_key" ON "User"("tiktokId");
