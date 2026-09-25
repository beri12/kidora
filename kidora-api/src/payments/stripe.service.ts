import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { PaymentProvider, PaymentStatus, PlanKey } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';
import { PaymentSettlementService } from './payment-settlement.service';

@Injectable()
export class StripeService {
  private logger = new Logger('Stripe');
  private stripe: Stripe;
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private pricing: PricingService,
    private settlement: PaymentSettlementService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_x', { apiVersion: '2024-06-20' });
  }

  // Create a hosted Checkout Session for the chosen plan.
  async createCheckout(userId: string, plan: 'family' | 'school') {
    // The price the pricing page showed, read from the same row.
    const item = await this.pricing.checkoutPrice(plan);
    const web = this.config.get<string>('app.webUrl');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price_data: { currency: item.currency.toLowerCase(), product_data: { name: 'Kidora ' + item.name }, unit_amount: item.amountMinor, recurring: { interval: 'month' } }, quantity: 1 }],
      success_url: web + '/dashboard?checkout=success',
      cancel_url: web + '/pricing?checkout=cancelled',
      client_reference_id: userId,
      metadata: { userId, plan },
    });
    await this.prisma.payment.create({ data: { userId, provider: PaymentProvider.stripe, plan: plan as PlanKey, amountCents: item.amountMinor, currency: item.currency, status: PaymentStatus.pending, externalId: session.id } });
    return { url: session.url };
  }

  // Verify + handle Stripe webhook events (raw body required).
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    } catch (e) {
      this.logger.error('Bad Stripe signature: ' + (e as Error).message);
      throw e;
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      // A completed session can still be unpaid (delayed payment methods).
      if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') {
        await this.settlement.settle({
          provider: PaymentProvider.stripe,
          externalId: s.id,
          amountMinor: s.amount_total ?? -1,
          currency: s.currency ?? '',
          userId: s.client_reference_id ?? undefined,
        });
      }
    }
    return { received: true };
  }
}
