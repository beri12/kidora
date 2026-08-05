import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';
import { PLAN_CATALOG } from './plans';
import { PlanKey, PaymentProvider, PaymentStatus } from '@prisma/client';

@Injectable()
export class StripeService {
  private logger = new Logger('Stripe');
  private stripe: Stripe;
  constructor(private config: ConfigService, private prisma: PrismaService, private email: EmailService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_x', { apiVersion: '2024-06-20' });
  }

  // Create a hosted Checkout Session for the chosen plan.
  async createCheckout(userId: string, plan: 'family' | 'school') {
    const item = PLAN_CATALOG[plan];
    const web = this.config.get<string>('app.webUrl');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Kidora ' + item.name }, unit_amount: item.amountCents, recurring: { interval: 'month' } }, quantity: 1 }],
      success_url: web + '/dashboard?checkout=success',
      cancel_url: web + '/pricing?checkout=cancelled',
      client_reference_id: userId,
      metadata: { userId, plan },
    });
    await this.prisma.payment.create({ data: { userId, provider: PaymentProvider.stripe, plan: plan as PlanKey, amountCents: item.amountCents, status: PaymentStatus.pending, externalId: session.id } });
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
      await this.activate(s.metadata?.userId, s.metadata?.plan as PlanKey, s.id);
    }
    return { received: true };
  }

  private async activate(userId?: string, plan?: PlanKey, externalId?: string) {
    if (!userId || !plan) return;
    await this.prisma.payment.updateMany({ where: { externalId }, data: { status: PaymentStatus.succeeded } });
    await this.prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'active', provider: PaymentProvider.stripe, renewsAt: new Date(Date.now() + 30 * 864e5) },
      create: { userId, plan, status: 'active', provider: PaymentProvider.stripe, renewsAt: new Date(Date.now() + 30 * 864e5) },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) this.email.sendSubscriptionSuccess(user.email, user.name, PLAN_CATALOG[plan as 'family' | 'school']?.name ?? plan);
  }
}
