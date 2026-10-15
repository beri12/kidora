-- Chapa (Ethiopian payments: Telebirr, CBE Birr, cards) as a payment provider,
-- and entitlements for the Student and Teacher plans on the pricing page.
-- Values are only added here; they are first used by the next migration,
-- because Postgres cannot use a new enum value in the transaction that adds it.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'chapa';
ALTER TYPE "PlanKey" ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE "PlanKey" ADD VALUE IF NOT EXISTS 'teacher';
