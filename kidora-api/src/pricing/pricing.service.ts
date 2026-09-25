import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanKind, PlanKey } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/** What the public pricing page shows for one plan. */
export interface PublicPlan {
  slug: string;
  audience: string;
  name: string;
  tagline: string;
  unitLabel: string;
  currency: string;
  /** Minor units (cents). Null = custom pricing / contact sales. */
  monthlyPriceMinor: number | null;
  yearlyPriceMinor: number | null;
  features: string[];
  /**
   * The plan "Get Started" can check out directly, for a signed-in visitor.
   * Null when this plan is sold another way (sign-up, contact sales).
   */
  checkoutPlan: 'family' | 'school' | null;
}

/**
 * The one source of prices. The pricing page reads them from here, and so
 * does checkout — so what a card shows is exactly what the provider is asked
 * to charge. Nothing about price lives in React components or constants.
 */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async publicCatalog() {
    const rows = await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const shape = (r: (typeof rows)[number]): PublicPlan => ({
      slug: r.slug,
      audience: r.audience,
      name: r.name,
      tagline: r.tagline,
      unitLabel: r.unitLabel,
      currency: r.currency,
      monthlyPriceMinor: r.monthlyPriceMinor,
      yearlyPriceMinor: r.yearlyPriceMinor,
      features: r.features,
      checkoutPlan:
        r.kind === PlanKind.ROLE_PLAN && r.monthlyPriceMinor && (r.grantsPlan === 'family' || r.grantsPlan === 'school')
          ? r.grantsPlan
          : null,
    });
    return {
      plans: rows.filter((r) => r.kind === PlanKind.ROLE_PLAN).map(shape),
      schoolTiers: rows.filter((r) => r.kind === PlanKind.SCHOOL_TIER).map(shape),
    };
  }

  /**
   * The monthly price checkout must charge for an entitlement, read from the
   * active plan that grants it. Throws rather than falling back to a default:
   * charging a price nobody was shown is worse than not selling.
   */
  async checkoutPrice(plan: PlanKey) {
    const row = await this.prisma.subscriptionPlan.findFirst({
      where: { grantsPlan: plan, kind: PlanKind.ROLE_PLAN, active: true, monthlyPriceMinor: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    if (!row?.monthlyPriceMinor) throw new NotFoundException('That plan is not available for purchase right now.');
    return { name: row.name, amountMinor: row.monthlyPriceMinor, currency: row.currency.toUpperCase() };
  }
}
