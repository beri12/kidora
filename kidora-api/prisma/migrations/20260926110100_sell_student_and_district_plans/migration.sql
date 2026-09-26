-- The Student and District Leader cards become purchasable: checkout grants
-- the plan the row names. (Teacher stays sign-up only until teacher plan
-- benefits exist — selling a plan that unlocks nothing would be wrong.)
UPDATE "SubscriptionPlan" SET "grantsPlan" = 'student'::"PlanKey", "updatedAt" = now() WHERE "slug" = 'plan-student';
UPDATE "SubscriptionPlan" SET "grantsPlan" = 'district'::"PlanKey", "updatedAt" = now() WHERE "slug" = 'plan-district';
