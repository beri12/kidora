import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaypalService, toMajor, toMinor } from './paypal.service';
import paymentsConfig from '../config/payments.config';

// Real PricingService, PaymentSettlementService and PaypalService over an
// in-memory stand-in for the Prisma calls they make, with PayPal's REST API
// replaced by a fetch mock. Tests assert resulting rows, not call shapes.
type Row = Record<string, any>;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    return row[k] === v;
  });
}

function setup(prices: { family?: number | null; school?: number | null } = {}, env: Record<string, string> = {}) {
  const plans: Row[] = [
    { slug: 'plan-parent', kind: 'ROLE_PLAN', grantsPlan: 'family', name: 'Parent', currency: 'USD', monthlyPriceMinor: prices.family === undefined ? 0 : prices.family, active: true, sortOrder: 20 },
    { slug: 'plan-school', kind: 'ROLE_PLAN', grantsPlan: 'school', name: 'School Leader', currency: 'USD', monthlyPriceMinor: prices.school === undefined ? 500 : prices.school, active: true, sortOrder: 40 },
    { slug: 'plan-teacher', kind: 'ROLE_PLAN', grantsPlan: null, name: 'Teacher', currency: 'USD', monthlyPriceMinor: 1999, active: true, sortOrder: 30 },
  ];
  const payments = new Map<string, Row>();
  const subs = new Map<string, Row>();
  let seq = 0;
  const prisma: any = {
    subscriptionPlan: {
      findMany: async () => plans,
      findFirst: async ({ where }: any) => plans.find((p) => p.grantsPlan === where.grantsPlan && p.kind === where.kind && p.active && p.monthlyPriceMinor != null) ?? null,
    },
    payment: {
      create: async ({ data }: any) => { const r = { id: `pay_${++seq}`, externalId: null, providerCaptureId: null, ...data }; payments.set(r.id, r); return { ...r }; },
      update: async ({ where, data }: any) => ({ ...Object.assign(payments.get(where.id)!, data) }),
      findUnique: async ({ where }: any) => { const r = [...payments.values()].find((p) => p.externalId === where.externalId); return r ? { ...r } : null; },
      updateMany: async ({ where, data }: any) => { const hit = [...payments.values()].filter((p) => matches(p, where)); hit.forEach((p) => Object.assign(p, data)); return { count: hit.length }; },
    },
    subscription: {
      findUnique: async ({ where }: any) => (subs.has(where.userId) ? { ...subs.get(where.userId) } : null),
      upsert: async ({ where, update, create }: any) => { const r = subs.has(where.userId) ? Object.assign(subs.get(where.userId)!, update) : { ...create }; subs.set(where.userId, r); return { ...r }; },
    },
    user: { findUnique: async () => ({ email: 'parent@example.com', name: 'Parent' }) },
  };

  const saved = { ...process.env };
  Object.assign(process.env, { PAYPAL_CLIENT_ID: 'client-id', PAYPAL_CLIENT_SECRET: 'client-secret', PAYPAL_ENVIRONMENT: 'sandbox', PAYPAL_MODE: '', ...env });
  const cfg = paymentsConfig();
  process.env = saved;
  const config: any = { get: () => cfg };

  const email: any = { sendSubscriptionSuccess: jest.fn() };
  const pricing = new PricingService(prisma, config);
  const settlement = new PaymentSettlementService(prisma, email, pricing);
  const paypal = new PaypalService(prisma, pricing, settlement, config);
  return { prisma, plans, payments, subs, email, pricing, settlement, paypal };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const token = () => json(200, { access_token: 'tok', expires_in: 32400 });
const captured = (paymentId: string, value = '5.00', status = 'COMPLETED') => json(201, {
  id: 'ORDER-1', status: status === 'PENDING' ? 'COMPLETED' : status,
  purchase_units: [{ custom_id: paymentId, payments: { captures: [{ id: 'CAP-1', status, amount: { currency_code: 'USD', value }, custom_id: paymentId }] } }],
});

const fetchMock = jest.fn();
const realFetch = global.fetch;
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock as unknown as typeof fetch; });
afterAll(() => { global.fetch = realFetch; });

describe('money helpers', () => {
  it('converts without float rounding', () => {
    expect(toMajor(0)).toBe('0.00');
    expect(toMajor(1299)).toBe('12.99');
    expect(toMinor('12.99')).toBe(1299);
    expect(toMinor('5')).toBe(500);
    expect(toMinor('5.5')).toBe(550);
    expect(toMinor('abc')).toBeNaN();
  });
});

describe('pricing catalog', () => {
  it('marks $0 plans pilot, priced plans paid, and leaves sign-up-only plans alone', async () => {
    const { pricing } = setup();
    const { plans } = await pricing.publicCatalog();
    expect(plans.map((p) => [p.slug, p.checkoutPlan, p.checkoutMode])).toEqual([
      ['plan-parent', 'family', 'pilot'], ['plan-school', 'school', 'paid'], ['plan-teacher', null, null],
    ]);
  });

  it('keeps a price below PAYMENTS_MIN_PAID_AMOUNT_CENTS out of checkout', async () => {
    const { pricing } = setup({ school: 50 }, { PAYMENTS_MIN_PAID_AMOUNT_CENTS: '100' });
    const school = (await pricing.publicCatalog()).plans.find((p) => p.slug === 'plan-school')!;
    expect(school.checkoutMode).toBeNull();
    await expect(pricing.checkoutPrice('school')).rejects.toThrow(NotFoundException);
  });
});

describe('$0 pilot activation', () => {
  it('grants the plan, records a $0 pilot payment, and never calls a provider', async () => {
    const t = setup();
    await expect(t.settlement.activatePilot('u1', 'family')).resolves.toEqual({ status: 'ACTIVE', plan: 'family', alreadyActive: false });
    expect(t.subs.get('u1')).toMatchObject({ plan: 'family', status: 'active', provider: 'pilot', renewsAt: null });
    expect([...t.payments.values()]).toEqual([expect.objectContaining({ provider: 'pilot', status: 'succeeded', amountCents: 0, plan: 'family' })]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is idempotent on a second click', async () => {
    const t = setup();
    await t.settlement.activatePilot('u1', 'family');
    await expect(t.settlement.activatePilot('u1', 'family')).resolves.toMatchObject({ alreadyActive: true });
    expect(t.payments.size).toBe(1);
    expect(t.email.sendSubscriptionSuccess).toHaveBeenCalledTimes(1);
  });

  it('refuses a priced plan, and a plan that is not sold', async () => {
    const t = setup();
    await expect(t.settlement.activatePilot('u1', 'school')).rejects.toThrow(BadRequestException);
    await expect(t.settlement.activatePilot('u1', 'district')).rejects.toThrow(NotFoundException);
    expect(t.subs.size).toBe(0);
  });

  it('switches with the price alone: the same plan at $0 activates, at $5 goes to PayPal', async () => {
    const pilot = setup({ school: 0 });
    await expect(pilot.settlement.activatePilot('u1', 'school')).resolves.toMatchObject({ status: 'ACTIVE' });

    const paid = setup({ family: 500 });
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json(201, { id: 'ORDER-1', status: 'CREATED' }));
    await expect(paid.paypal.createOrder('u1', 'family')).resolves.toMatchObject({ orderId: 'ORDER-1' });
  });
});

describe('PayPal checkout', () => {
  async function ordered(t = setup()) {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json(201, { id: 'ORDER-1', status: 'CREATED' }));
    await t.paypal.createOrder('u1', 'school');
    return { ...t, payment: [...t.payments.values()][0] };
  }

  it('creates an order for the database price, with an idempotency key, on the sandbox host', async () => {
    const t = await ordered();
    expect(t.payment).toMatchObject({ provider: 'paypal', status: 'pending', amountCents: 500, externalId: 'ORDER-1' });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
    expect(init.headers['PayPal-Request-Id']).toBe(t.payment.id);
    expect(JSON.parse(init.body).purchase_units[0]).toMatchObject({ custom_id: t.payment.id, amount: { currency_code: 'USD', value: '5.00' } });
  });

  it('never creates a PayPal order for a $0 plan', async () => {
    const t = setup();
    await expect(t.paypal.createOrder('u1', 'family')).rejects.toThrow('free right now');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(t.payments.size).toBe(0);
  });

  it('captures, settles once, and grants the plan', async () => {
    const t = await ordered();
    fetchMock.mockResolvedValueOnce(captured(t.payment.id));
    await expect(t.paypal.capture('u1', 'ORDER-1')).resolves.toEqual({ status: 'COMPLETED', granted: true, plan: 'school' });
    expect(fetchMock.mock.calls[2][1].headers['PayPal-Request-Id']).toBe(`capture-${t.payment.id}`);
    expect(t.payments.get(t.payment.id)).toMatchObject({ status: 'succeeded', providerCaptureId: 'CAP-1' });
    expect(t.subs.get('u1')).toMatchObject({ plan: 'school', status: 'active', provider: 'paypal' });

    // A second capture call changes nothing and does not call PayPal again.
    await expect(t.paypal.capture('u1', 'ORDER-1')).resolves.toMatchObject({ granted: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(t.email.sendSubscriptionSuccess).toHaveBeenCalledTimes(1);
  });

  it("refuses to capture another user's order", async () => {
    const t = await ordered();
    await expect(t.paypal.capture('intruder', 'ORDER-1')).rejects.toThrow(NotFoundException);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a capture for the wrong amount', async () => {
    const t = await ordered();
    fetchMock.mockResolvedValueOnce(captured(t.payment.id, '0.01'));
    await expect(t.paypal.capture('u1', 'ORDER-1')).rejects.toThrow(BadRequestException);
    expect(t.payments.get(t.payment.id)!.status).toBe('failed');
    expect(t.subs.size).toBe(0);
  });

  it('rejects a capture that belongs to a different payment', async () => {
    const t = await ordered();
    fetchMock.mockResolvedValueOnce(captured('pay_other'));
    await expect(t.paypal.capture('u1', 'ORDER-1')).rejects.toThrow(BadRequestException);
    expect(t.subs.size).toBe(0);
  });

  it('waits for the money when PayPal holds the capture', async () => {
    const t = await ordered();
    fetchMock.mockResolvedValueOnce(captured(t.payment.id, '5.00', 'PENDING'));
    await expect(t.paypal.capture('u1', 'ORDER-1')).resolves.toMatchObject({ status: 'PENDING', granted: false });
    expect(t.subs.size).toBe(0);
  });

  it('recovers an order PayPal already captured', async () => {
    const t = await ordered();
    fetchMock
      .mockResolvedValueOnce(json(422, { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] }))
      .mockResolvedValueOnce(captured(t.payment.id));
    await expect(t.paypal.capture('u1', 'ORDER-1')).resolves.toMatchObject({ granted: true });
  });

  it('marks a declined payment failed with a friendly message', async () => {
    const t = await ordered();
    fetchMock.mockResolvedValueOnce(json(422, { name: 'UNPROCESSABLE_ENTITY', debug_id: 'dbg', details: [{ issue: 'INSTRUMENT_DECLINED' }] }));
    await expect(t.paypal.capture('u1', 'ORDER-1')).rejects.toThrow('Payment could not be completed. Please try again.');
    expect(t.payments.get(t.payment.id)!.status).toBe('failed');
  });

  it('reports an outage (network, bad credentials) as temporarily unavailable', async () => {
    const t = setup();
    fetchMock.mockResolvedValueOnce(json(401, { error: 'invalid_client' }));
    await expect(t.paypal.createOrder('u1', 'school')).rejects.toThrow(ServiceUnavailableException);
    expect([...t.payments.values()][0].status).toBe('failed');

    const t2 = await ordered();
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(t2.paypal.capture('u1', 'ORDER-1')).rejects.toThrow('temporarily unavailable');
    expect(t2.payments.get(t2.payment.id)!.status).toBe('pending'); // still retryable
  });

  it('records a cancelled checkout without granting anything', async () => {
    const t = await ordered();
    await expect(t.paypal.cancel('u1', 'ORDER-1')).resolves.toEqual({ cancelled: true });
    expect(t.payments.get(t.payment.id)!.status).toBe('cancelled');
    await expect(t.paypal.cancel('intruder', 'ORDER-1')).resolves.toEqual({ cancelled: false });
    expect(t.subs.size).toBe(0);
  });

  it('is off without credentials, and on an unknown environment', () => {
    expect(setup({}, { PAYPAL_CLIENT_SECRET: '' }).paypal.publicConfig()).toEqual({ clientId: null, environment: null });
    expect(setup({}, { PAYPAL_ENVIRONMENT: 'prod' }).paypal.enabled).toBe(false);
    expect(setup({}, { PAYPAL_ENVIRONMENT: 'production' }).paypal.publicConfig()).toEqual({ clientId: 'client-id', environment: 'production' });
  });
});
