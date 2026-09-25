import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';

/** What the provider says was actually paid, after its own verification. */
export interface ProviderReport {
  provider: PaymentProvider;
  externalId: string;
  /** Minor units, as the provider reported them. */
  amountMinor: number;
  currency: string;
  /** The Kidora user the provider tied the payment to, when it carries one. */
  userId?: string;
}

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

  constructor(private prisma: PrismaService, private email: EmailService) {}

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
        where: { id: payment.id, status: PaymentStatus.pending },
        data: { status: PaymentStatus.failed },
      });
      return 'rejected';
    }

    const { count } = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.pending },
      data: { status: PaymentStatus.succeeded },
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
