import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanKind, PlanKey, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { PaymentsConfig } from '../config/payments.config';

/** Entitlements checkout sells. Teacher waits until teacher plan benefits exist. */
const SELLABLE: PlanKey[] = ['student', 'family', 'school', 'district'];

export const PRICING_MESSAGES = {
  unavailable: 'That plan is not available for purchase right now.',
  noPaymentNeeded: 'This plan is free right now, so no payment is needed.',
  paymentRequired: 'This plan requires payment. Please choose a way to pay.',
} as const;

/**
 * How a sellable plan is obtained, decided by its monthly price alone:
 *   pilot — $0 (the Kidora pilot): activated directly, no payment provider
 *   paid  — above $0: Chapa / card / PayPal checkout for exactly that price
 */
export type CheckoutMode = 'pilot' | 'paid';

/** What the public pricing page shows for one plan. */
export interface PublicPlan {
  slug: string;
  audience: string;
  name: string;
  tagline: string;
  unitLabel: string;
  currency: string;
  /** Minor units (cents). Null = custom pricing / contact sales. 0 = free during the pilot. */
  monthlyPriceMinor: number | null;
  yearlyPriceMinor: number | null;
  features: string[];
  /**
   * The plan "Get Started" can check out directly, for a signed-in visitor.
   * Null when this plan is sold another way (sign-up, contact sales).
   */
  checkoutPlan: 'student' | 'family' | 'school' | 'district' | null;
  /** Set whenever checkoutPlan is: `pilot` activates for free, `paid` opens checkout. */
  checkoutMode: CheckoutMode | null;
}

/**
 * The one source of prices. The pricing page reads them from here, and so
 * does checkout — so what a card shows is exactly what the provider is asked
 * to charge. Nothing about price lives in React components or constants.
 *
 * Moving a plan between the pilot and paid checkout is a data change: set its
 * monthlyPriceMinor to 0 or to the price. See docs/PAYMENTS.md.
 */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private get minPaidMinor(): number {
    return this.config.get<PaymentsConfig>('payments')?.minPaidAmountCents ?? 1;
  }

  /** `paid` below the configured minimum is a misconfiguration: not sold. */
  private modeFor(r: SubscriptionPlan): CheckoutMode | null {
    if (r.kind !== PlanKind.ROLE_PLAN || r.monthlyPriceMinor == null || !r.grantsPlan || !SELLABLE.includes(r.grantsPlan)) return null;
    if (r.monthlyPriceMinor === 0) return 'pilot';
    return r.monthlyPriceMinor >= this.minPaidMinor ? 'paid' : null;
  }

  async publicCatalog() {
    const rows = await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const shape = (r: (typeof rows)[number]): PublicPlan => {
      const checkoutMode = this.modeFor(r);
      return {
        slug: r.slug,
        audience: r.audience,
        name: r.name,
        tagline: r.tagline,
        unitLabel: r.unitLabel,
        currency: r.currency,
        monthlyPriceMinor: r.monthlyPriceMinor,
        yearlyPriceMinor: r.yearlyPriceMinor,
        features: r.features,
        checkoutPlan: checkoutMode ? (r.grantsPlan as PublicPlan['checkoutPlan']) : null,
        checkoutMode,
      };
    };
    return {
      plans: rows.filter((r) => r.kind === PlanKind.ROLE_PLAN).map(shape),
      schoolTiers: rows.filter((r) => r.kind === PlanKind.SCHOOL_TIER).map(shape),
    };
  }

  /** The active, priced row that grants this entitlement, or a 404. */
  private async sellableRow(plan: PlanKey) {
    const row = await this.prisma.subscriptionPlan.findFirst({
      where: { grantsPlan: plan, kind: PlanKind.ROLE_PLAN, active: true, monthlyPriceMinor: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    const mode = row ? this.modeFor(row) : null;
    if (!row || !mode) throw new NotFoundException(PRICING_MESSAGES.unavailable);
    return { row, mode };
  }

  /**
   * The monthly price checkout must charge for an entitlement, read from the
   * active plan that grants it. Throws rather than falling back to a default:
   * charging a price nobody was shown is worse than not selling. A $0 plan is
   * never sent to a payment provider.
   */
  async checkoutPrice(plan: PlanKey) {
    const { row, mode } = await this.sellableRow(plan);
    if (mode === 'pilot') throw new BadRequestException(PRICING_MESSAGES.noPaymentNeeded);
    return { name: row.name, amountMinor: row.monthlyPriceMinor!, currency: row.currency.toUpperCase() };
  }

  /** The plan, if it can be activated without payment right now; otherwise a 4xx. */
  async pilotTerms(plan: PlanKey) {
    const { row, mode } = await this.sellableRow(plan);
    if (mode !== 'pilot') throw new BadRequestException(PRICING_MESSAGES.paymentRequired);
    return { name: row.name, currency: row.currency.toUpperCase() };
  }
}
