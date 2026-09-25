import { StripeService } from '../src/payments/stripe.service';
import { PaymentSettlementService } from '../src/payments/payment-settlement.service';

/**
 * checkout.session.completed → the plan is granted only when Stripe's
 * report matches the Payment row Kidora wrote at checkout, and only once.
 */
function setup(paymentOverrides: Record<string, unknown> = {}) {
  const payment = {
    id: 'pay_1', provider: 'stripe', externalId: 'sess_1', userId: 'u1', plan: 'family',
    amountCents: 799, currency: 'USD', status: 'pending', ...paymentOverrides,
  };
  const prisma: any = {
    payment: {
      findUnique: jest.fn(async () => payment),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.status && where.status !== payment.status) return { count: 0 };
        payment.status = data.status;
        return { count: 1 };
      }),
    },
    subscription: { upsert: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Leo' }) },
  };
  const email: any = { sendSubscriptionSuccess: jest.fn() };
  const config: any = { get: () => 'http://localhost:3000' };
  const settlement = new PaymentSettlementService(prisma, email);
  const svc = new StripeService(config, prisma, {} as any, settlement);
  const deliver = (session: Record<string, unknown>) => {
    (svc as any).stripe = { webhooks: { constructEvent: () => ({ type: 'checkout.session.completed', data: { object: session } }) } };
    return svc.handleWebhook(Buffer.from('{}'), 'sig');
  };
  return { prisma, email, payment, deliver };
}

const paid = { id: 'sess_1', payment_status: 'paid', amount_total: 799, currency: 'usd', client_reference_id: 'u1' };

describe('StripeService.handleWebhook', () => {
  it('grants the plan from Kidora’s own payment row, and emails', async () => {
    const { prisma, email, deliver } = setup();
    await expect(deliver(paid)).resolves.toEqual({ received: true });
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1' }, update: expect.objectContaining({ plan: 'family', status: 'active' }),
    }));
    expect(email.sendSubscriptionSuccess).toHaveBeenCalledWith('a@b.com', 'Leo', 'family');
  });

  it('grants once when the same webhook is delivered twice', async () => {
    const { prisma, deliver } = setup();
    await deliver(paid);
    await deliver(paid);
    expect(prisma.subscription.upsert).toHaveBeenCalledTimes(1);
  });

  it('refuses a payment for the wrong amount', async () => {
    const { prisma, payment, deliver } = setup();
    await deliver({ ...paid, amount_total: 1 });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(payment.status).toBe('failed');
  });

  it('refuses a payment in the wrong currency', async () => {
    const { prisma, deliver } = setup();
    await deliver({ ...paid, currency: 'eur' });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('refuses a session that claims to be someone else’s payment', async () => {
    const { prisma, deliver } = setup();
    await deliver({ ...paid, client_reference_id: 'attacker' });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('grants nothing for a completed but unpaid session', async () => {
    const { prisma, deliver } = setup();
    await deliver({ ...paid, payment_status: 'unpaid' });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });
});
