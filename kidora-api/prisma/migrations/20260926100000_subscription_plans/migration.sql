-- Pricing moves out of code and into the database, so it can change without a
-- deploy. The rows below are the initial prices from the approved pricing
-- design (USD, yearly = 12 months less 20%); edit them, or switch a plan to
-- ETB, by updating the row. Prices are in minor units (cents).

-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('ROLE_PLAN', 'SCHOOL_TIER');

-- CreateEnum
CREATE TYPE "PlanAudience" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'SCHOOL', 'DISTRICT');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PlanKind" NOT NULL DEFAULT 'ROLE_PLAN',
    "audience" "PlanAudience" NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "unitLabel" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "monthlyPriceMinor" INTEGER,
    "yearlyPriceMinor" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantsPlan" "PlanKey",
    "maxStudents" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_kind_active_sortOrder_idx" ON "SubscriptionPlan"("kind", "active", "sortOrder");



-- Initial prices.
INSERT INTO "SubscriptionPlan" ("id", "slug", "kind", "audience", "name", "tagline", "unitLabel", "currency", "monthlyPriceMinor", "yearlyPriceMinor", "features", "grantsPlan", "sortOrder", "updatedAt") VALUES
  (gen_random_uuid()::text, 'plan-student', 'ROLE_PLAN', 'STUDENT', 'Student', 'Access amazing courses and grow your skills!', 'Per student', 'USD', 499, 4790, ARRAY['Access to all student courses','Track your progress','Earn certificates','Personal learning dashboard']::TEXT[], NULL, 10, now()),
  (gen_random_uuid()::text, 'plan-parent', 'ROLE_PLAN', 'PARENT', 'Parent', 'Support your child''s learning journey with confidence.', 'Per parent', 'USD', 799, 7670, ARRAY['Manage child accounts','View learning progress','Safe & secure environment','Parent dashboard & reports']::TEXT[], 'family'::"PlanKey", 20, now()),
  (gen_random_uuid()::text, 'plan-teacher', 'ROLE_PLAN', 'TEACHER', 'Teacher', 'Create and sell your courses. Inspire more learners.', 'Per teacher', 'USD', 1999, 19190, ARRAY['Create & sell courses','Manage your students','Track engagement & progress','Earn revenue']::TEXT[], NULL, 30, now()),
  (gen_random_uuid()::text, 'plan-school', 'ROLE_PLAN', 'SCHOOL', 'School Leader', 'Manage your school''s learning and grow together.', 'Per school', 'USD', 4999, 47990, ARRAY['School-wide course access','Manage teachers & students','Custom school pricing','Detailed analytics & reports']::TEXT[], 'school'::"PlanKey", 40, now()),
  (gen_random_uuid()::text, 'plan-district', 'ROLE_PLAN', 'DISTRICT', 'District Leader', 'Oversee multiple schools and maximize impact.', 'Per district', 'USD', 9999, 95990, ARRAY['Manage multiple schools','District-wide analytics','Custom pricing & policies','Priority support']::TEXT[], 'district'::"PlanKey", 50, now()),
  (gen_random_uuid()::text, 'tier-elementary', 'SCHOOL_TIER', 'SCHOOL', 'Elementary', '', 'Per school', 'USD', 4900, 47040, ARRAY[]::TEXT[], NULL, 110, now()),
  (gen_random_uuid()::text, 'tier-middle', 'SCHOOL_TIER', 'SCHOOL', 'Middle School', '', 'Per school', 'USD', 7900, 75840, ARRAY[]::TEXT[], NULL, 120, now()),
  (gen_random_uuid()::text, 'tier-high', 'SCHOOL_TIER', 'SCHOOL', 'High School', '', 'Per school', 'USD', 9900, 95040, ARRAY[]::TEXT[], NULL, 130, now()),
  (gen_random_uuid()::text, 'tier-all', 'SCHOOL_TIER', 'SCHOOL', 'All Levels', '', 'Per school', 'USD', 14900, 143040, ARRAY[]::TEXT[], NULL, 140, now());
