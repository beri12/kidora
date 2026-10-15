-- Provider identities move from three columns on "User" to "SocialAccount",
-- so a Kidora user can hold any number of providers and new ones need no
-- schema change. The old columns are left in place (nothing reads or writes
-- them after this) and are copied across below, so no link is lost.

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'TIKTOK', 'FACEBOOK', 'APPLE', 'MICROSOFT', 'GITHUB');

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerId_key" ON "SocialAccount"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_provider_key" ON "SocialAccount"("userId", "provider");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing Google / Facebook / TikTok link becomes a row.
INSERT INTO "SocialAccount" ("id", "userId", "provider", "providerId", "email", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'GOOGLE'::"AuthProvider", "googleId", "email", now(), now() FROM "User" WHERE "googleId" IS NOT NULL
UNION ALL
SELECT gen_random_uuid()::text, "id", 'FACEBOOK'::"AuthProvider", "facebookId", "email", now(), now() FROM "User" WHERE "facebookId" IS NOT NULL
UNION ALL
SELECT gen_random_uuid()::text, "id", 'TIKTOK'::"AuthProvider", "tiktokId", "email", now(), now() FROM "User" WHERE "tiktokId" IS NOT NULL;
