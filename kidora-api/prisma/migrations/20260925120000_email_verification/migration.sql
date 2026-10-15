-- Email + password sign-in now requires a verified address (the code is
-- emailed at registration). Every account that exists before this change was
-- created without that step, so it is treated as verified rather than being
-- locked out on its next sign-in. No schema change: `emailVerified` already
-- exists.
UPDATE "User" SET "emailVerified" = true WHERE "email" IS NOT NULL AND "emailVerified" = false;
