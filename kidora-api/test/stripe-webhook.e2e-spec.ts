import { StripeService } from '../src/payments/stripe.service';

// Verifies the webhook activates a subscription + emails on checkout.session.completed.
describe('StripeService.handleWebhook', () => {
  const prisma: any = {
    payment: { create: jest.fn(), updateMany: jest.fn() },
    subscription: { upsert: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Leo' }) },
  };
  const email: any = { sendSubscriptionSuccess: jest.fn() };
  const config: any = { get: () => 'http://localhost:3000' };
  const svc = new StripeService(config, prisma, email);

  it('activates subscription on completed checkout', async () => {
    // stub the Stripe SDK signature verification
    (svc as any).stripe = { webhooks: { constructEvent: () => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_1', metadata: { userId: 'u1', plan: 'family' } } },
    }) } };
    const res = await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(res).toEqual({ received: true });
    expect(prisma.subscription.upsert).toHaveBeenCalled();
    expect(email.sendSubscriptionSuccess).toHaveBeenCalledWith('a@b.com', 'Leo', expect.any(String));
  });
});
