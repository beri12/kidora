import {
  BadRequestException, ConflictException, HttpException, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus, PlanKey } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { PaymentSettlementService } from './payment-settlement.service';
import type { PaymentsConfig, PaypalConfig, PaypalEnvironment } from '../config/payments.config';
import type { CheckoutPlan } from './dto/payment.dto';

// PayPal Orders v2 over REST (the old @paypal/checkout-server-sdk is no longer
// supported by PayPal). The client secret and access tokens never leave this
// file and are never logged; PayPal's own error text never reaches the browser.

export const PAYPAL_MESSAGES = {
  unavailable: 'Payment service is temporarily unavailable. Please try again.',
  failed: 'Payment could not be completed. Please try again.',
  notFound: 'We could not find that payment.',
  refunded: 'This payment has been refunded.',
} as const;

interface PaypalAmount { currency_code: string; value: string }
interface PaypalCapture { id: string; status: string; amount: PaypalAmount; custom_id?: string }
export interface PaypalOrder {
  id: string;
  status: string;
  purchase_units?: { custom_id?: string; payments?: { captures?: PaypalCapture[] } }[];
}

export interface CaptureResult {
  /** COMPLETED once the plan is granted; PENDING while PayPal reviews the payment. */
  status: 'COMPLETED' | 'PENDING';
  granted: boolean;
  plan: PlanKey;
}

/** A PayPal API failure: `issue` is PayPal's reason code, `debugId` what PayPal support asks for. */
export class PaypalApiError extends Error {
  constructor(public readonly status: number, public readonly issue: string | undefined, public readonly debugId: string | undefined, message: string) {
    super(message);
    this.name = 'PaypalApiError';
  }
}

/** "12.99" -> 1299 without going through a float. */
export function toMinor(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value ?? '');
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0')) : NaN;
}

/** 1299 -> "12.99". */
export function toMajor(minor: number): string {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}

const TIMEOUT_MS = 15_000;

@Injectable()
export class PaypalService implements OnModuleInit {
  private logger = new Logger('PayPal');
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    private settlement: PaymentSettlementService,
    private config: ConfigService,
  ) {}

  private get settings(): PaypalConfig {
    return this.config.get<PaymentsConfig>('payments')!.paypal;
  }

  onModuleInit() {
    const s = this.settings;
    if (s.environmentRaw && !s.environment) this.logger.error(`PAYPAL_ENVIRONMENT="${s.environmentRaw}" is not recognised (use sandbox or production). PayPal is off.`);
    else if (!this.enabled) this.logger.log('PayPal is off (set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET).');
    else this.logger.log(`PayPal: ${s.environment} (${s.apiBaseUrl})`);
  }

  get enabled(): boolean {
    const s = this.settings;
    return Boolean(s.clientId && s.clientSecret && s.environment);
  }

  /** Safe for the browser: a PayPal client id is public by design. */
  publicConfig(): { clientId: string | null; environment: PaypalEnvironment | null } {
    return this.enabled ? { clientId: this.settings.clientId, environment: this.settings.environment } : { clientId: null, environment: null };
  }

  async createOrder(userId: string, plan: CheckoutPlan) {
    // The price the pricing page showed, read from the same row. A $0 plan
    // is refused here: it is activated, never charged.
    const item = await this.pricing.checkoutPrice(plan);
    if (!this.enabled) throw new ServiceUnavailableException(PAYPAL_MESSAGES.unavailable);

    // The row exists before PayPal is called, so its id can be both the
    // PayPal-Request-Id (a retried create returns the same order) and the
    // custom_id the capture is checked against.
    const payment = await this.prisma.payment.create({
      data: { userId, provider: PaymentProvider.paypal, plan: plan as PlanKey, amountCents: item.amountMinor, currency: item.currency, status: PaymentStatus.pending },
    });
    try {
      const order = await this.call<PaypalOrder>('POST', '/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: plan,
          custom_id: payment.id,
          description: `Kidora ${item.name} (1 month)`,
          amount: { currency_code: item.currency, value: toMajor(item.amountMinor) },
        }],
        application_context: { brand_name: 'Kidora', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
      }, payment.id);
      await this.prisma.payment.update({ where: { id: payment.id }, data: { externalId: order.id } });
      this.logger.log(`Order ${order.id} created: payment=${payment.id} user=${userId} plan=${plan} ${toMajor(item.amountMinor)} ${item.currency}`);
      // `orderId` is what the web app reads; `id` is kept for older clients.
      return { id: order.id, orderId: order.id };
    } catch (e) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.failed } });
      throw this.toHttp(e);
    }
  }

  /**
   * Capture after the buyer approves in the PayPal popup. The plan is granted
   * only through PaymentSettlementService, which checks the captured amount,
   * currency and payer against the Payment row created with the order.
   */
  async capture(userId: string, orderId: string): Promise<CaptureResult> {
    const payment = await this.prisma.payment.findUnique({ where: { externalId: orderId } });
    // Someone else's order is reported exactly like a missing one.
    if (!payment || payment.userId !== userId || payment.provider !== PaymentProvider.paypal) throw new NotFoundException(PAYPAL_MESSAGES.notFound);
    if (payment.status === PaymentStatus.succeeded) return { status: 'COMPLETED', granted: true, plan: payment.plan };
    if (payment.status === PaymentStatus.refunded) throw new ConflictException(PAYPAL_MESSAGES.refunded);

    let order: PaypalOrder;
    try {
      // Same request id on every retry: PayPal never captures twice and
      // answers a repeat with the original capture.
      order = await this.call<PaypalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, `capture-${payment.id}`);
    } catch (e) {
      if (e instanceof PaypalApiError && e.issue === 'ORDER_ALREADY_CAPTURED') {
        // Captured before but never recorded here (e.g. a restart mid-request).
        order = await this.call<PaypalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`).catch((err: unknown) => { throw this.toHttp(err); });
      } else {
        // Declined card, unapproved or expired order: final for this order.
        if (e instanceof PaypalApiError && e.status >= 400 && e.status < 500) await this.markFailed(payment.id);
        throw this.toHttp(e);
      }
    }

    const unit = order.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    const reference = cap?.custom_id ?? unit?.custom_id;
    if (!cap || reference !== payment.id) {
      this.logger.error(`Order ${orderId} does not belong to payment ${payment.id} (custom_id=${reference ?? '-'}, capture=${cap?.id ?? '-'}). Needs manual review.`);
      await this.markFailed(payment.id, cap?.id);
      throw new BadRequestException(PAYPAL_MESSAGES.failed);
    }
    if (cap.status === 'PENDING') {
      // PayPal is holding the funds for review: nothing unlocks until they clear.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerCaptureId: cap.id } });
      this.logger.warn(`Order ${orderId} capture ${cap.id} is PENDING; plan not granted yet.`);
      return { status: 'PENDING', granted: false, plan: payment.plan };
    }
    if (order.status !== 'COMPLETED' || cap.status !== 'COMPLETED') {
      this.logger.warn(`Order ${orderId} finished ${order.status}/${cap.status}; not granted.`);
      await this.markFailed(payment.id, cap.id);
      throw new BadRequestException(PAYPAL_MESSAGES.failed);
    }

    const outcome = await this.settlement.settle({
      provider: PaymentProvider.paypal,
      externalId: orderId,
      amountMinor: toMinor(cap.amount.value),
      currency: cap.amount.currency_code,
      userId,
      captureId: cap.id,
    });
    if (outcome === 'rejected') throw new BadRequestException(PAYPAL_MESSAGES.failed);
    return { status: 'COMPLETED', granted: true, plan: payment.plan };
  }

  /** The buyer closed PayPal. Bookkeeping only: an unapproved order cannot be charged. */
  async cancel(userId: string, orderId: string): Promise<{ cancelled: boolean }> {
    const { count } = await this.prisma.payment.updateMany({
      where: { externalId: orderId, userId, provider: PaymentProvider.paypal, status: PaymentStatus.pending },
      data: { status: PaymentStatus.cancelled },
    });
    return { cancelled: count > 0 };
  }

  // ---------------------------------------------------------------------------

  private async markFailed(paymentId: string, captureId?: string) {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { in: [PaymentStatus.pending, PaymentStatus.cancelled] } },
      data: { status: PaymentStatus.failed, ...(captureId ? { providerCaptureId: captureId } : {}) },
    });
  }

  /** Outages become "temporarily unavailable"; anything else "could not be completed". */
  private toHttp(e: unknown): HttpException {
    if (e instanceof HttpException) return e;
    if (e instanceof PaypalApiError) {
      const outage = e.status === 0 || e.status === 401 || e.status >= 500;
      return outage ? new ServiceUnavailableException(PAYPAL_MESSAGES.unavailable) : new BadRequestException(PAYPAL_MESSAGES.failed);
    }
    this.logger.error(e);
    return new ServiceUnavailableException(PAYPAL_MESSAGES.unavailable);
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown, requestId?: string, retried = false): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    if (requestId) headers['PayPal-Request-Id'] = requestId;
    const res = await this.fetch(`${this.settings.apiBaseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    // A token can be revoked before its stated expiry; fetch a new one once.
    if (res.status === 401 && !retried) {
      this.token = null;
      return this.call<T>(method, path, body, requestId, true);
    }
    if (!res.ok) throw await this.toError(res, `${method} ${path}`);
    return (await res.json()) as T;
  }

  private async accessToken(): Promise<string> {
    if (!this.enabled) throw new PaypalApiError(503, 'NOT_CONFIGURED', undefined, 'PayPal is not configured');
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const { clientId, clientSecret, apiBaseUrl } = this.settings;
    const res = await this.fetch(`${apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      // Bad or revoked credentials are an operator problem, never the buyer's.
      const err = await this.toError(res, 'POST /v1/oauth2/token');
      throw new PaypalApiError(503, 'AUTH_FAILED', err.debugId, err.message);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    // Renew a minute early so a token never expires mid-request.
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  private async fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      throw new PaypalApiError(0, 'NETWORK', undefined, `PayPal unreachable: ${(e as Error).message}`);
    }
  }

  private async toError(res: Response, what: string): Promise<PaypalApiError> {
    let body: { name?: string; message?: string; debug_id?: string; details?: { issue?: string }[]; error?: string; error_description?: string } = {};
    try { body = await res.json(); } catch { /* non-JSON error page */ }
    const issue = body.details?.[0]?.issue ?? body.name ?? body.error;
    const debugId = body.debug_id ?? res.headers.get('paypal-debug-id') ?? undefined;
    this.logger.warn(`${what} -> ${res.status} ${issue ?? ''} debug_id=${debugId ?? 'n/a'}`);
    return new PaypalApiError(res.status, issue, debugId, body.message ?? body.error_description ?? `PayPal ${res.status}`);
  }
}
