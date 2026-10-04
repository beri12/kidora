import {
  BadRequestException, ConflictException, HttpException, Injectable, Logger, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { Payment, PaymentProvider, PaymentStatus, PlanKey, Prisma, Subscription } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';
import { PlansService, PLAN_UNAVAILABLE, PublicPlan, formatAmount } from './plans.service';
import { PaypalApiError, PaypalOrder, PaypalService } from './paypal.service';

// Messages the pricing page shows verbatim. Nothing PayPal returns is ever
// forwarded to the browser — it is logged with its debug_id instead.
export const MESSAGES = {
  paymentRequired: 'This plan requires payment. Please check out with PayPal.',
  noPaymentNeeded: 'This plan is free right now, so no payment is needed.',
  paypalUnavailable: 'Payment service is temporarily unavailable. Please try again.',
  paymentFailed: 'Payment could not be completed. Please try again.',
  paymentNotFound: 'We could not find that payment.',
  refunded: 'This payment has been refunded.',
} as const;

export interface CatalogResponse {
  plans: PublicPlan[];
  paypal: ReturnType<PaypalService['publicConfig']>;
}

export interface ActivationResult {
  /** ACTIVE once access is granted; PENDING when PayPal is still reviewing the capture. */
  status: 'ACTIVE' | 'PENDING';
  plan: PlanKey;
  provider: PaymentProvider | null;
  renewsAt: Date | null;
  /** True when this call changed nothing (double click, refresh, retried capture). */
  alreadyActive: boolean;
}

export interface CreatedOrder {
  orderId: string;
  plan: PlanKey;
  amount: string;
  currency: string;
}

type Tx = Prisma.TransactionClient;

/** A subscription that currently grants its plan. */
function isLive(sub: Subscription | null, now = new Date()): sub is Subscription {
  return !!sub && sub.status === 'active' && (!sub.renewsAt || sub.renewsAt > now);
}

/**
 * Plan activation and PayPal checkout.
 *
 *   $0 plan  -> activatePlan(): recorded as a `pilot` payment, PayPal never called
 *   paid plan -> createPaypalOrder() -> buyer approves -> capturePaypalOrder()
 *
 * The amount always comes from the Plan table and the user always from the
 * JWT. The browser only ever says which plan, and which order to capture.
 */
@Injectable()
export class PaymentsService {
  private logger = new Logger('Payments');

  constructor(
    private prisma: PrismaService,
    private plans: PlansService,
    private paypal: PaypalService,
    private email: EmailService,
  ) {}

  async catalog(): Promise<CatalogResponse> {
    const plans = await this.plans.list();
    return { plans: plans.map((p) => this.plans.toPublic(p)), paypal: this.paypal.publicConfig() };
  }

  // ---------------------------------------------------------------------------
  // $0 plans: pilot and free tier
  // ---------------------------------------------------------------------------

  async activatePlan(userId: string, key: PlanKey): Promise<ActivationResult> {
    const plan = await this.plans.require(key);
    const mode = this.plans.checkoutMode(plan);
    if (mode === 'paypal') throw new BadRequestException(MESSAGES.paymentRequired);
    if (mode !== 'pilot' && mode !== 'free') throw new BadRequestException(PLAN_UNAVAILABLE);

    const result = await this.withUserLock(userId, async (tx) => {
      const current = await tx.subscription.findUnique({ where: { userId } });
      if (isLive(current) && current.plan === key) return this.result(current, true);

      let externalId: string | null = null;
      if (mode === 'pilot') {
        // A record of the activation, not a pretend transaction: no provider
        // was called and no money moved.
        const payment = await tx.payment.create({
          data: { userId, provider: PaymentProvider.pilot, status: PaymentStatus.succeeded, plan: key, amountCents: 0, currency: plan.currency },
        });
        externalId = payment.id;
      }
      const sub = await this.activate(tx, userId, key, {
        provider: mode === 'pilot' ? PaymentProvider.pilot : null,
        externalId,
        renewsAt: null,
      });
      return this.result(sub, false);
    });

    if (!result.alreadyActive) {
      this.logger.log(`${mode} activation: user=${userId} plan=${key}`);
      if (mode === 'pilot') void this.notify(userId, plan.name);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Paid plans: PayPal Orders v2, intent CAPTURE
  // ---------------------------------------------------------------------------

  async createPaypalOrder(userId: string, key: PlanKey): Promise<CreatedOrder> {
    const plan = await this.plans.require(key);
    const mode = this.plans.checkoutMode(plan);
    if (mode === 'pilot' || mode === 'free') throw new BadRequestException(MESSAGES.noPaymentNeeded);
    if (mode !== 'paypal') throw new BadRequestException(PLAN_UNAVAILABLE);
    if (!this.paypal.isConfigured()) throw new ServiceUnavailableException(MESSAGES.paypalUnavailable);

    const amount = formatAmount(plan.priceCents);
    // The row exists before PayPal is called, so its id can be the PayPal
    // request id (a retried create returns the same order) and the custom_id
    // the capture is checked against.
    const payment = await this.prisma.payment.create({
      data: { userId, provider: PaymentProvider.paypal, status: PaymentStatus.pending, plan: key, amountCents: plan.priceCents, currency: plan.currency },
    });

    try {
      const order = await this.paypal.createOrder({
        requestId: payment.id,
        customId: payment.id,
        referenceId: plan.key,
        description: `Kidora ${plan.name} (1 ${plan.billingInterval})`,
        amount: { currency_code: plan.currency, value: amount },
      });
      await this.prisma.payment.update({ where: { id: payment.id }, data: { externalId: order.id } });
      this.logger.log(`order ${order.id} created: payment=${payment.id} user=${userId} plan=${key} ${amount} ${plan.currency}`);
      return { orderId: order.id, plan: key, amount, currency: plan.currency };
    } catch (e) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.failed } });
      throw this.toHttp(e);
    }
  }

  async capturePaypalOrder(userId: string, orderId: string): Promise<ActivationResult> {
    const payment = await this.prisma.payment.findUnique({ where: { externalId: orderId } });
    // Someone else's order is reported exactly like a missing one.
    if (!payment || payment.userId !== userId || payment.provider !== PaymentProvider.paypal) {
      throw new NotFoundException(MESSAGES.paymentNotFound);
    }
    if (payment.status === PaymentStatus.succeeded) return this.current(userId);
    if (payment.status === PaymentStatus.refunded) throw new ConflictException(MESSAGES.refunded);

    let order: PaypalOrder;
    try {
      // Same request id on every retry, so PayPal never captures twice and a
      // repeat returns the original capture.
      order = await this.paypal.captureOrder(orderId, `capture-${payment.id}`);
    } catch (e) {
      if (e instanceof PaypalApiError && e.issue === 'ORDER_ALREADY_CAPTURED') {
        // Captured earlier but never recorded here (e.g. the API restarted
        // mid-request). Read the order and finish the job.
        order = await this.paypal.getOrder(orderId).catch((err: unknown) => { throw this.toHttp(err); });
      } else {
        if (e instanceof PaypalApiError && e.status >= 400 && e.status < 500 && e.status !== 401) {
          // Declined card, unapproved order, expired order: final for this order.
          await this.markFailed(payment.id);
        }
        throw this.toHttp(e);
      }
    }
    return this.finalizeCapture(userId, payment, order);
  }

  /** The buyer closed PayPal. Bookkeeping only — an unapproved order cannot be charged. */
  async cancelPaypalOrder(userId: string, orderId: string): Promise<{ cancelled: boolean }> {
    const res = await this.prisma.payment.updateMany({
      where: { externalId: orderId, userId, provider: PaymentProvider.paypal, status: PaymentStatus.pending },
      data: { status: PaymentStatus.cancelled },
    });
    return { cancelled: res.count > 0 };
  }

  private async finalizeCapture(userId: string, payment: Payment, order: PaypalOrder): Promise<ActivationResult> {
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const reference = capture?.custom_id ?? unit?.custom_id;
    const expected = formatAmount(payment.amountCents);

    // Verify PayPal charged what this Payment row says, for this Payment row.
    if (!capture || reference !== payment.id || capture.amount.value !== expected || capture.amount.currency_code !== payment.currency) {
      this.logger.error(
        `order ${order.id} does not match payment ${payment.id}: expected ${expected} ${payment.currency} ref=${payment.id}, ` +
        `got ${capture?.amount.value ?? '-'} ${capture?.amount.currency_code ?? '-'} ref=${reference ?? '-'} capture=${capture?.id ?? '-'}. Needs manual review.`,
      );
      await this.markFailed(payment.id, capture?.id);
      throw new BadRequestException(MESSAGES.paymentFailed);
    }

    if (capture.status === 'PENDING') {
      // PayPal is holding the funds for review. Access waits for the money;
      // a webhook (or support) completes it later.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerCaptureId: capture.id } });
      this.logger.warn(`order ${order.id} capture ${capture.id} is PENDING; plan not activated yet.`);
      return { status: 'PENDING', plan: payment.plan, provider: PaymentProvider.paypal, renewsAt: null, alreadyActive: false };
    }

    if (order.status !== 'COMPLETED' || capture.status !== 'COMPLETED') {
      this.logger.warn(`order ${order.id} finished ${order.status}/${capture.status}; not activating.`);
      await this.markFailed(payment.id, capture.id);
      throw new BadRequestException(MESSAGES.paymentFailed);
    }

    const plan = await this.plans.find(payment.plan);
    const result = await this.withUserLock(userId, async (tx) => {
      // Only the call that flips the row to succeeded activates anything; a
      // concurrent or repeated capture sees count 0 and changes nothing.
      const won = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.succeeded } },
        data: { status: PaymentStatus.succeeded, providerCaptureId: capture.id },
      });
      const current = await tx.subscription.findUnique({ where: { userId } });
      if (won.count === 0 && current) return this.result(current, true);

      // Paying again for the plan you already have extends it rather than
      // throwing away the days left.
      const from = isLive(current) && current.plan === payment.plan && current.renewsAt ? current.renewsAt : new Date();
      const sub = await this.activate(tx, userId, payment.plan, {
        provider: PaymentProvider.paypal,
        externalId: order.id,
        renewsAt: this.plans.periodEnd(plan ?? { billingInterval: 'month' }, from),
      });
      return this.result(sub, false);
    });

    if (!result.alreadyActive) {
      this.logger.log(`order ${order.id} captured: capture=${capture.id} user=${userId} plan=${payment.plan} ${expected} ${payment.currency}`);
      void this.notify(userId, plan?.name ?? payment.plan);
    }
    return result;
  }

  // ---------------------------------------------------------------------------

  private activate(tx: Tx, userId: string, plan: PlanKey, src: { provider: PaymentProvider | null; externalId: string | null; renewsAt: Date | null }) {
    const data = { plan, status: 'active', provider: src.provider, externalId: src.externalId, renewsAt: src.renewsAt };
    return tx.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  }

  /**
   * Serialises activations for one user (double clicks, two tabs, a retried
   * capture racing the first). The lock is released when the transaction ends.
   */
  private withUserLock<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'subscription:' + userId}))`;
      return fn(tx);
    });
  }

  private async current(userId: string): Promise<ActivationResult> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException(MESSAGES.paymentNotFound);
    return this.result(sub, true);
  }

  private result(sub: Subscription, alreadyActive: boolean): ActivationResult {
    return { status: 'ACTIVE', plan: sub.plan, provider: sub.provider, renewsAt: sub.renewsAt, alreadyActive };
  }

  private async markFailed(paymentId: string, captureId?: string) {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { not: PaymentStatus.succeeded } },
      data: { status: PaymentStatus.failed, ...(captureId ? { providerCaptureId: captureId } : {}) },
    });
  }

  private async notify(userId: string, planName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) await this.email.sendSubscriptionSuccess(user.email, user.name, planName);
  }

  /** PayPal failures become one of two friendly messages; details stay in the log. */
  private toHttp(e: unknown): HttpException {
    if (e instanceof HttpException) return e;
    if (e instanceof PaypalApiError) {
      const outage = e.status === 0 || e.status === 401 || e.status >= 500;
      return outage ? new ServiceUnavailableException(MESSAGES.paypalUnavailable) : new BadRequestException(MESSAGES.paymentFailed);
    }
    this.logger.error(e);
    return new ServiceUnavailableException(MESSAGES.paypalUnavailable);
  }
}
