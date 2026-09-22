-- Per-user preferences, so settings persist across devices instead of living
-- only in browser state. Written idempotently so an interrupted run can be
-- marked rolled back and replayed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';
