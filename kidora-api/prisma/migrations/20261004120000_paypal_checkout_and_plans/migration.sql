-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('month', 'year');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'pilot';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerCaptureId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Plan" (
    "key" "PlanKey" NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'month',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pilotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerCaptureId_key" ON "Payment"("providerCaptureId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");


-- Seed the pilot catalog. Every plan is $0 while Kidora is in pilot, so each
-- one is activated directly and PayPal is never called. To start charging,
-- update the row (see docs/PAYMENTS.md) — no code change or deploy needed:
--   UPDATE "Plan" SET "priceCents" = 500, "pilotEnabled" = false WHERE "key" = 'family';
-- ON CONFLICT keeps any prices already set by hand if this is replayed.
INSERT INTO "Plan" ("key", "name", "priceCents", "currency", "billingInterval", "active", "pilotEnabled", "sortOrder", "updatedAt") VALUES
  ('free',     'Free',           0, 'USD', 'month', true, false, 0, CURRENT_TIMESTAMP),
  ('family',   'Family Premium', 0, 'USD', 'month', true, true,  1, CURRENT_TIMESTAMP),
  ('school',   'School',         0, 'USD', 'month', true, true,  2, CURRENT_TIMESTAMP),
  ('district', 'District',       0, 'USD', 'month', true, true,  3, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
