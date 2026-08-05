import { Injectable, Logger } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../infrastructure/email/email.service';
import { PLAN_CATALOG } from './plans';
import { PlanKey, PaymentProvider, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaypalService {
  private logger = new Logger('PayPal');
  private client: paypal.core.PayPalHttpClient;
  constructor(private prisma: PrismaService, private email: EmailService) {
    const env = process.env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID ?? '', process.env.PAYPAL_CLIENT_SECRET ?? '')
      : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID ?? 'test', process.env.PAYPAL_CLIENT_SECRET ?? 'test');
    this.client = new paypal.core.PayPalHttpClient(env);
  }

  async createOrder(userId: string, plan: 'family' | 'school') {
    const item = PLAN_CATALOG[plan];
    const req = new paypal.orders.OrdersCreateRequest();
    req.prefer('return=representation');
    req.requestBody({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: (item.amountCents / 100).toFixed(2) }, custom_id: userId + ':' + plan }] });
    const order = await this.client.execute(req);
    await this.prisma.payment.create({ data: { userId, provider: PaymentProvider.paypal, plan: plan as PlanKey, amountCents: item.amountCents, status: PaymentStatus.pending, externalId: order.result.id } });
    return { id: order.result.id };
  }

  // Capture after the buyer approves in the PayPal popup, then activate + email.
  async capture(userId: string, orderId: string) {
    const req = new paypal.orders.OrdersCaptureRequest(orderId);
    req.requestBody({} as any);
    const capture = await this.client.execute(req);
    const custom = capture.result?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
      ?? capture.result?.purchase_units?.[0]?.custom_id;
    const plan = (custom?.split(':')[1] ?? 'family') as PlanKey;
    await this.prisma.payment.updateMany({ where: { externalId: orderId }, data: { status: PaymentStatus.succeeded } });
    await this.prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'active', provider: PaymentProvider.paypal, renewsAt: new Date(Date.now() + 30 * 864e5) },
      create: { userId, plan, status: 'active', provider: PaymentProvider.paypal, renewsAt: new Date(Date.now() + 30 * 864e5) },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) this.email.sendSubscriptionSuccess(user.email, user.name, PLAN_CATALOG[plan as 'family' | 'school']?.name ?? plan);
    return { status: capture.result.status };
  }
}
