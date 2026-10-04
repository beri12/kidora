import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, PlanKey } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';
import { PricingService } from '../pricing/pricing.service';

/** What the provider says was actually paid, after its own verification. */
export interface ProviderReport {
  provider: PaymentProvider;
  externalId: string;
  /** Minor units, as the provider reported them. */
  amountMinor: number;
  currency: string;
  /** The Kidora user the provider tied the payment to, when it carries one. */
  userId?: string;
  /** PayPal's capture id, kept for refund and dispute webhooks. */
  captureId?: string;
}

export interface PilotActivation {
  status: 'ACTIVE';
  plan: PlanKey;
  /** True when the plan was already active, so nothing changed (double click, refresh). */
  alreadyActive: boolean;
}

/** A payment the buyer abandoned can still settle if the provider later reports it paid. */
const SETTLEABLE = { in: [PaymentStatus.pending, PaymentStatus.cancelled] };

/**
 * The only way a payment turns into an entitlement.
 *
 * The plan, the price and the payer come from Kidora's own Payment row,
 * written before the buyer was sent to the provider — never from the
 * provider's metadata or the browser. The provider's report must match that
 * row exactly (amount, currency, payer) or nothing is granted.
 *
 * Idempotent: the row moves pending → succeeded with a conditional update, so
 * a webhook delivered twice (or a capture racing a webhook) grants once.
 */
@Injectable()
export class PaymentSettlementService {
  private logger = new Logger('Payments');

  constructor(private prisma: PrismaService, private email: EmailService, private pricing: PricingService) {}

  /**
   * A $0 plan during the pilot: granted straight away, with no provider call.
   * Recorded as a `pilot` payment of 0 — a record of the activation, not a
   * pretend transaction. Refused unless the plan's price is exactly 0 now.
   */
  async activatePilot(userId: string, plan: PlanKey): Promise<PilotActivation> {
    const terms = await this.pricing.pilotTerms(plan);
    const current = await this.prisma.subscription.findUnique({ where: { userId } });
    const live = current?.status === 'active' && (!current.renewsAt || current.renewsAt > new Date());
    if (live && current.plan === plan) return { status: 'ACTIVE', plan, alreadyActive: true };

    const payment = await this.prisma.payment.create({
      data: { userId, provider: PaymentProvider.pilot, status: PaymentStatus.succeeded, plan, amountCents: 0, currency: terms.currency },
    });
    // No end date: pilot access lasts until the pilot is closed (docs/PAYMENTS.md).
    const data = { plan, status: 'active', provider: PaymentProvider.pilot, externalId: payment.id, renewsAt: null };
    await this.prisma.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    this.logger.log(`Pilot activation: user=${userId} plan=${plan}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) this.email.sendSubscriptionSuccess(user.email, user.name, terms.name);
    return { status: 'ACTIVE', plan, alreadyActive: false };
  }

  async settle(report: ProviderReport): Promise<'granted' | 'already-settled' | 'rejected'> {
    const payment = await this.prisma.payment.findUnique({ where: { externalId: report.externalId } });
    if (!payment || payment.provider !== report.provider) {
      this.logger.warn(`${report.provider} reported unknown payment ${report.externalId}; ignored.`);
      return 'rejected';
    }
    if (payment.status === PaymentStatus.succeeded) return 'already-settled';

    const mismatch =
      payment.amountCents !== report.amountMinor ? `amount ${report.amountMinor} ≠ expected ${payment.amountCents}`
      : payment.currency.toUpperCase() !== report.currency.toUpperCase() ? `currency ${report.currency} ≠ expected ${payment.currency}`
      : report.userId && report.userId !== payment.userId ? 'payer does not own this payment'
      : null;
    if (mismatch) {
      this.logger.error(`Payment ${payment.id} (${report.provider} ${report.externalId}) rejected: ${mismatch}.`);
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: SETTLEABLE },
        data: { status: PaymentStatus.failed, ...(report.captureId ? { providerCaptureId: report.captureId } : {}) },
      });
      return 'rejected';
    }

    const { count } = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: SETTLEABLE },
      data: { status: PaymentStatus.succeeded, ...(report.captureId ? { providerCaptureId: report.captureId } : {}) },
    });
    if (count !== 1) return 'already-settled';

    const renewsAt = new Date(Date.now() + 30 * 864e5);
    await this.prisma.subscription.upsert({
      where: { userId: payment.userId },
      update: { plan: payment.plan, status: 'active', provider: report.provider, externalId: report.externalId, renewsAt },
      create: { userId: payment.userId, plan: payment.plan, status: 'active', provider: report.provider, externalId: report.externalId, renewsAt },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payment.userId } });
    if (user?.email) this.email.sendSubscriptionSuccess(user.email, user.name, payment.plan);
    return 'granted';
  }
}
