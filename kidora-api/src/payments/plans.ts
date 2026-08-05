import { PlanKey } from '@prisma/client';
// Plan catalog — prices in cents. Keep in sync with the frontend PLANS.
export const PLAN_CATALOG: Record<Exclude<PlanKey, 'free'>, { name: string; amountCents: number }> = {
  family: { name: 'Family Premium', amountCents: 1299 },
  school: { name: 'School', amountCents: 9900 },
  district: { name: 'District', amountCents: 0 }, // custom / contact sales
};
