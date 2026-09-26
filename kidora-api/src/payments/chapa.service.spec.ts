import axios from 'axios';
import { ChapaService, toMajor, toMinor } from './chapa.service';
import { PaymentSettlementService } from './payment-settlement.service';

jest.mock('axios');
const mocked = axios as jest.Mocked<typeof axios>;

const REF = 'kidora-3f0c1e2a-1111-4222-8333-944455556666';

function setup(overrides: Record<string, unknown> = {}) {
  const payment: any = {
    id: 'p1', provider: 'chapa', externalId: REF, userId: 'u1', plan: 'student',
    amountCents: 499, currency: 'USD', status: 'pending', ...overrides,
  };
  const prisma: any = {
    payment: {
      create: jest.fn(async ({ data }: any) => Object.assign(payment, data)),
      findUnique: jest.fn(async () => payment),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.status && where.status !== payment.status) return { count: 0 };
        payment.status = data.status;
        return { count: 1 };
      }),
    },
    subscription: { upsert: jest.fn() },
    user: { findUnique: jest.fn(async () => ({ id: 'u1', email: 'a@b.c', name: 'Abebe Bekele', phone: '+251911223344' })) },
  };
  const pricing: any = { checkoutPrice: jest.fn(async () => ({ name: 'Student', amountMinor: 499, currency: 'USD' })) };
  const settlement = new PaymentSettlementService(prisma, { sendSubscriptionSuccess: jest.fn() } as any);
  const config: any = { get: () => 'https://justkidora.com' };
  return { svc: new ChapaService(config, prisma, pricing, settlement), prisma, payment };
}

const verifyReply = (data: Record<string, unknown>) =>
  mocked.get.mockResolvedValueOnce({ data: { status: 'success', data: { tx_ref: REF, status: 'success', amount: '4.99', currency: 'USD', ...data } } });

beforeEach(() => {
  jest.resetAllMocks();
  process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-x';
  delete process.env.CHAPA_WEBHOOK_SECRET;
});

describe('Chapa money conversion', () => {
  it('formats minor units without float drift', () => {
    expect(toMajor(499)).toBe('4.99');
    expect(toMajor(4790)).toBe('47.90');
    expect(toMajor(5)).toBe('0.05');
  });
  it('parses Chapa amounts back to minor units', () => {
    expect(toMinor('4.99')).toBe(499);
    expect(toMinor(4.9)).toBe(490);
    expect(toMinor('100')).toBe(10000);
    expect(toMinor('abc')).toBeNaN();
  });
});

describe('ChapaService', () => {
  it('starts checkout at the database price and returns Chapa\'s page', async () => {
    const { svc, prisma } = setup();
    mocked.post.mockResolvedValueOnce({ data: { status: 'success', data: { checkout_url: 'https://checkout.chapa.co/x' } } });

    const res = await svc.createCheckout('u1', 'student');

    expect(res.url).toBe('https://checkout.chapa.co/x');
    const body = mocked.post.mock.calls[0][1] as any;
    expect(body).toMatchObject({ amount: '4.99', currency: 'USD', email: 'a@b.c', phone_number: '0911223344' });
    expect(body.customization.title.length).toBeLessThanOrEqual(16);
    expect(prisma.payment.create.mock.calls[0][0].data).toMatchObject({ provider: 'chapa', amountCents: 499, status: 'pending' });
  });

  it('grants the plan once Chapa confirms the full amount, and only once', async () => {
    const { svc, prisma } = setup();
    verifyReply({});
    await expect(svc.confirm(REF)).resolves.toMatchObject({ status: 'paid' });
    await expect(svc.confirm(REF)).resolves.toMatchObject({ status: 'paid' });
    expect(prisma.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(mocked.get).toHaveBeenCalledTimes(1); // the second call short-circuits on the settled row
  });

  it('refuses an underpayment', async () => {
    const { svc, prisma, payment } = setup();
    verifyReply({ amount: '0.99' });
    await expect(svc.confirm(REF)).resolves.toMatchObject({ status: 'failed' });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(payment.status).toBe('failed');
  });

  it('grants nothing while Chapa says the payment is not complete', async () => {
    const { svc, prisma } = setup();
    verifyReply({ status: 'pending' });
    await expect(svc.confirm(REF)).resolves.toMatchObject({ status: 'pending' });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('will not confirm someone else\'s payment for the signed-in user', async () => {
    const { svc } = setup();
    await expect(svc.confirm(REF, 'intruder')).rejects.toThrow('Unknown payment reference');
    expect(mocked.get).not.toHaveBeenCalled();
  });

  it('rejects a webhook with a bad signature when a secret is configured', () => {
    const { svc } = setup();
    process.env.CHAPA_WEBHOOK_SECRET = 'whsec';
    const body = Buffer.from('{"tx_ref":"x"}');
    const good = require('crypto').createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(svc.verifyWebhookSignature(body, good)).toBe(true);
    expect(svc.verifyWebhookSignature(body, 'forged')).toBe(false);
  });
});
