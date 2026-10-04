import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan, PlanKey } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { PaymentsConfig } from '../config/payments.config';

/**
 * How a plan is obtained, decided here and nowhere else:
 *   free    — the permanently free tier ($0, not a pilot price)
 *   pilot   — $0 during the Kidora pilot; activated without PayPal
 *   paypal  — priced above zero; paid through PayPal checkout
 *   contact — $0 but not self-serve (e.g. a district contract)
 *   unavailable — switched off, or priced below the configured minimum
 */
export type CheckoutMode = 'free' | 'pilot' | 'paypal' | 'contact' | 'unavailable';

export const PLAN_UNAVAILABLE = 'This plan is currently unavailable.';

/** Days of access one payment buys. */
export const INTERVAL_DAYS = { month: 30, year: 365 } as const;

export interface PublicPlan {
  id: PlanKey;
  name: string;
  priceCents: number;
  /** Decimal string, e.g. "12.99" — what PayPal will be asked to charge. */
  price: string;
  currency: string;
  billingInterval: Plan['billingInterval'];
  checkout: CheckoutMode;
}

/** Cents to the decimal string PayPal expects, without float rounding. */
export function formatAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/**
 * The plan catalog. Prices live in the Plan table so the pilot ($0) and later
 * paid prices differ only in data — see docs/PAYMENTS.md.
 */
@Injectable()
export class PlansService {
  private logger = new Logger('Plans');

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  list(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  find(key: PlanKey): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { key } });
  }

  /** The plan, or a 400 the pricing page can show as-is. */
  async require(key: PlanKey): Promise<Plan> {
    const plan = await this.find(key);
    if (!plan || !plan.active) throw new BadRequestException(PLAN_UNAVAILABLE);
    return plan;
  }

  checkoutMode(plan: Plan): CheckoutMode {
    if (!plan.active) return 'unavailable';
    if (plan.priceCents > 0) {
      const min = this.config.get<PaymentsConfig>('payments')?.minPaidAmountCents ?? 1;
      if (plan.priceCents < min) {
        this.logger.warn(`Plan ${plan.key} costs ${plan.priceCents}c, below PAYMENTS_MIN_PAID_AMOUNT_CENTS=${min}; hidden from checkout.`);
        return 'unavailable';
      }
      return 'paypal';
    }
    if (plan.pilotEnabled) return 'pilot';
    if (plan.key === PlanKey.free) return 'free';
    return 'contact';
  }

  toPublic(plan: Plan): PublicPlan {
    return {
      id: plan.key,
      name: plan.name,
      priceCents: plan.priceCents,
      price: formatAmount(plan.priceCents),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      checkout: this.checkoutMode(plan),
    };
  }

  /** When a period bought today ends. */
  periodEnd(plan: Pick<Plan, 'billingInterval'>, from = new Date()): Date {
    return new Date(from.getTime() + INTERVAL_DAYS[plan.billingInterval] * 864e5);
  }
}
