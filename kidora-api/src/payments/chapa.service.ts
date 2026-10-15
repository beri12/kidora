import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { PaymentProvider, PaymentStatus, PlanKey } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { apiBaseUrl } from '../config/oauth-callback';

const CHAPA_API = process.env.CHAPA_API_URL || 'https://api.chapa.co/v1';

/** Minor units → Chapa's decimal string ("7.99"). Integer maths until the last step. */
export function toMajor(minor: number): string {
  const whole = Math.floor(minor / 100);
  const cents = String(minor % 100).padStart(2, '0');
  return `${whole}.${cents}`;
}

/** Chapa's amount ("7.99", 7.99, "7.9") → minor units, without float drift. */
export function toMinor(amount: string | number): number {
  const [whole, frac = ''] = String(amount).trim().split('.');
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(frac)) return NaN;
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

/**
 * Chapa — Ethiopian checkout (Telebirr, CBE Birr, M-Pesa, cards).
 *
 *   1. createCheckout: a pending Payment row is written with the price read
 *      from the pricing table, then Chapa is asked for a hosted checkout URL.
 *   2. The buyer pays on Chapa's page.
 *   3. Chapa calls our webhook / callback, and the buyer returns to the web
 *      app, which asks us to confirm. All three paths end in confirm(),
 *      which asks Chapa's verify API what really happened — nothing in a
 *      callback body, query string or browser is trusted — and hands the
 *      verified amount to PaymentSettlementService, which grants the plan
 *      once and only if it matches the Payment row.
 *
 * Needs CHAPA_SECRET_KEY (CHASECK_...). CHAPA_WEBHOOK_SECRET, when set, is
 * checked on webhook deliveries as well.
 */
@Injectable()
export class ChapaService {
  private logger = new Logger('Chapa');

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private pricing: PricingService,
    private settlement: PaymentSettlementService,
  ) {}

  private get secret() {
    return (process.env.CHAPA_SECRET_KEY || process.env.CHAPA_CLIENT_SECRET || '').trim();
  }

  get enabled() {
    return Boolean(this.secret);
  }

  async createCheckout(userId: string, plan: Exclude<PlanKey, 'free'>) {
    if (!this.enabled) throw new ServiceUnavailableException('Chapa payments are not configured on this server.');

    const item = await this.pricing.checkoutPrice(plan);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, phone: true } });
    if (!user) throw new BadRequestException('Account not found');

    const txRef = `kidora-${randomUUID()}`;
    const web = this.config.get<string>('app.webUrl');
    const [first, ...rest] = (user.name || 'Kidora').trim().split(/\s+/);

    await this.prisma.payment.create({
      data: {
        userId, provider: PaymentProvider.chapa, plan, amountCents: item.amountMinor,
        currency: item.currency, status: PaymentStatus.pending, externalId: txRef,
      },
    });

    try {
      const { data } = await axios.post(
        `${CHAPA_API}/transaction/initialize`,
        {
          amount: toMajor(item.amountMinor),
          currency: item.currency,
          tx_ref: txRef,
          first_name: first,
          last_name: rest.join(' ') || first,
          // Chapa rejects malformed contact details; send only what we have.
          ...(user.email ? { email: user.email } : {}),
          ...(user.phone?.startsWith('+2519') || user.phone?.startsWith('+2517') ? { phone_number: '0' + user.phone.slice(4) } : {}),
          callback_url: `${apiBaseUrl()}/payments/chapa/callback`,
          return_url: `${web}/payment/return?provider=chapa&tx_ref=${encodeURIComponent(txRef)}`,
          customization: {
            // Chapa limits the title to 16 characters.
            title: 'Kidora',
            description: `Kidora ${item.name} plan`.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 50),
          },
        },
        { headers: { Authorization: `Bearer ${this.secret}` }, timeout: 15_000 },
      );
      const url = data?.data?.checkout_url;
      if (data?.status !== 'success' || !url) throw new Error(JSON.stringify(data?.message ?? data));
      return { url, txRef };
    } catch (e) {
      const detail = axios.isAxiosError(e) ? JSON.stringify(e.response?.data ?? e.message) : (e as Error).message;
      this.logger.error(`Chapa initialize failed for ${txRef}: ${detail}`);
      await this.prisma.payment.updateMany({ where: { externalId: txRef, status: PaymentStatus.pending }, data: { status: PaymentStatus.failed } });
      throw new ServiceUnavailableException("We couldn't start Chapa checkout. Please try again in a moment.");
    }
  }

  /**
   * Asks Chapa what happened to `txRef` and settles it. Safe to call any
   * number of times, from any path.
   */
  async confirm(txRef: string, expectedUserId?: string) {
    if (!/^kidora-[0-9a-f-]{36}$/.test(txRef)) throw new BadRequestException('Unknown payment reference');
    const payment = await this.prisma.payment.findUnique({ where: { externalId: txRef } });
    if (!payment || payment.provider !== PaymentProvider.chapa) throw new BadRequestException('Unknown payment reference');
    if (expectedUserId && payment.userId !== expectedUserId) throw new BadRequestException('Unknown payment reference');
    if (payment.status === PaymentStatus.succeeded) return { status: 'paid' as const, plan: payment.plan };

    let verified: { status?: string; amount?: string | number; currency?: string; tx_ref?: string } | undefined;
    try {
      const { data } = await axios.get(`${CHAPA_API}/transaction/verify/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${this.secret}` },
        timeout: 15_000,
      });
      verified = data?.data;
    } catch (e) {
      // Chapa answers 4xx for a reference that was never paid.
      const detail = axios.isAxiosError(e) ? JSON.stringify(e.response?.data ?? e.message) : (e as Error).message;
      this.logger.warn(`Chapa verify ${txRef}: ${detail}`);
      return { status: 'pending' as const, plan: payment.plan };
    }

    if (verified?.status !== 'success' || verified.tx_ref !== txRef) {
      return { status: verified?.status === 'failed' ? ('failed' as const) : ('pending' as const), plan: payment.plan };
    }

    const outcome = await this.settlement.settle({
      provider: PaymentProvider.chapa,
      externalId: txRef,
      amountMinor: toMinor(verified.amount ?? ''),
      currency: verified.currency ?? '',
      userId: payment.userId,
    });
    return { status: outcome === 'rejected' ? ('failed' as const) : ('paid' as const), plan: payment.plan };
  }

  /**
   * Webhook signature, when CHAPA_WEBHOOK_SECRET is configured: an HMAC-SHA256
   * of the raw body, sent as `x-chapa-signature` (or `chapa-signature`).
   * Even a valid signature only triggers confirm(), which re-verifies with Chapa.
   */
  verifyWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const secret = process.env.CHAPA_WEBHOOK_SECRET?.trim();
    if (!secret) return true;
    if (!rawBody || !signature) return false;
    const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
    const given = Buffer.from(signature.trim());
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
