import { Injectable, Logger } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';
import { PrismaService } from '../database/prisma.service';
import { PaymentProvider, PaymentStatus, PlanKey } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';
import { PaymentSettlementService } from './payment-settlement.service';
import type { CheckoutPlan } from './dto/payment.dto';

@Injectable()
export class PaypalService {
  private logger = new Logger('PayPal');
  private client: paypal.core.PayPalHttpClient;
  constructor(private prisma: PrismaService, private pricing: PricingService, private settlement: PaymentSettlementService) {
    const env = process.env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID ?? '', process.env.PAYPAL_CLIENT_SECRET ?? '')
      : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID ?? 'test', process.env.PAYPAL_CLIENT_SECRET ?? 'test');
    this.client = new paypal.core.PayPalHttpClient(env);
  }

  async createOrder(userId: string, plan: CheckoutPlan) {
    // The price the pricing page showed, read from the same row.
    const item = await this.pricing.checkoutPrice(plan);
    const req = new paypal.orders.OrdersCreateRequest();
    req.prefer('return=representation');
    req.requestBody({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: item.currency, value: (item.amountMinor / 100).toFixed(2) }, custom_id: userId + ':' + plan }] });
    const order = await this.client.execute(req);
    await this.prisma.payment.create({ data: { userId, provider: PaymentProvider.paypal, plan: plan as PlanKey, amountCents: item.amountMinor, currency: item.currency, status: PaymentStatus.pending, externalId: order.result.id } });
    // `orderId` is what the web app reads; `id` is kept for older clients.
    return { id: order.result.id, orderId: order.result.id };
  }

  /**
   * Capture after the buyer approves in the PayPal popup. The plan is granted
   * only if PayPal says the capture COMPLETED and the captured amount,
   * currency and payer match the Payment row created with the order.
   */
  async capture(userId: string, orderId: string) {
    const req = new paypal.orders.OrdersCaptureRequest(orderId);
    req.requestBody({} as any);
    const capture = await this.client.execute(req);
    const unit = capture.result?.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    if (capture.result?.status !== 'COMPLETED' || cap?.status !== 'COMPLETED') {
      this.logger.warn(`PayPal order ${orderId} not completed (${capture.result?.status}/${cap?.status}).`);
      return { status: capture.result?.status ?? 'UNKNOWN', granted: false };
    }
    const custom: string | undefined = cap?.custom_id ?? unit?.custom_id;
    const outcome = await this.settlement.settle({
      provider: PaymentProvider.paypal,
      externalId: orderId,
      amountMinor: Math.round(Number(cap?.amount?.value ?? NaN) * 100),
      currency: cap?.amount?.currency_code ?? '',
      userId: custom?.split(':')[0] === userId ? userId : `mismatch:${custom}`,
    });
    return { status: capture.result.status, granted: outcome !== 'rejected' };
  }
}
