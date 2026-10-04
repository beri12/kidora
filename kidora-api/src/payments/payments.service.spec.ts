import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService, MESSAGES } from './payments.service';
import { PlansService, PLAN_UNAVAILABLE, formatAmount } from './plans.service';
import { PaypalApiError, PaypalOrder } from './paypal.service';

// An in-memory stand-in for the few Prisma calls the payment flow makes, so
// the tests check resulting state (rows, statuses) rather than call shapes.
type Row = Record<string, any>;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) =>
    v && typeof v === 'object' && 'not' in v ? row[k] !== v.not : row[k] === v);
}

function makeDb(planOverrides: Record<string, Partial<Row>> = {}) {
  const plans: Record<string, Row> = {
    free: { key: 'free', name: 'Free', priceCents: 0, currency: 'USD', billingInterval: 'month', active: true, pilotEnabled: false, sortOrder: 0 },
    family: { key: 'family', name: 'Family Premium', priceCents: 0, currency: 'USD', billingInterval: 'month', active: true, pilotEnabled: true, sortOrder: 1 },
    school: { key: 'school', name: 'School', priceCents: 500, currency: 'USD', billingInterval: 'month', active: true, pilotEnabled: false, sortOrder: 2 },
    district: { key: 'district', name: 'District', priceCents: 0, currency: 'USD', billingInterval: 'month', active: true, pilotEnabled: false, sortOrder: 3 },
  };
  for (const [k, o] of Object.entries(planOverrides)) Object.assign(plans[k], o);

  const payments = new Map<string, Row>();
  const subs = new Map<string, Row>();
  let seq = 0;

  const prisma: any = {
    plan: {
      findMany: async () => Object.values(plans).sort((a, b) => a.sortOrder - b.sortOrder),
      findUnique: async ({ where }: any) => plans[where.key] ?? null,
    },
    payment: {
      create: async ({ data }: any) => {
        const row = { id: `pay_${++seq}`, status: 'pending', currency: 'USD', externalId: null, providerCaptureId: null, ...data };
        payments.set(row.id, row);
        return { ...row };
      },
      update: async ({ where, data }: any) => ({ ...Object.assign(payments.get(where.id)!, data) }),
      findUnique: async ({ where }: any) => {
        const row = [...payments.values()].find((p) => p.externalId === where.externalId);
        return row ? { ...row } : null;
      },
      updateMany: async ({ where, data }: any) => {
        const hit = [...payments.values()].filter((p) => matches(p, where));
        hit.forEach((p) => Object.assign(p, data));
        return { count: hit.length };
      },
    },
    subscription: {
      findUnique: async ({ where }: any) => (subs.has(where.userId) ? { ...subs.get(where.userId) } : null),
      upsert: async ({ where, update, create }: any) => {
        const row = subs.has(where.userId) ? Object.assign(subs.get(where.userId)!, update) : { id: `sub_${++seq}`, ...create };
        subs.set(where.userId, row);
        return { ...row };
      },
    },
    user: { findUnique: async () => ({ email: 'parent@example.com', name: 'Parent' }) },
    $queryRaw: jest.fn(async () => [{ locked: 1 }]),
  };
  prisma.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma, plans, payments, subs };
}

function completedOrder(paymentId: string, value = '5.00', over: Partial<PaypalOrder> = {}, captureStatus = 'COMPLETED'): PaypalOrder {
  return {
    id: 'ORDER-1',
    status: 'COMPLETED',
    purchase_units: [{
      custom_id: paymentId,
      payments: { captures: [{ id: 'CAPTURE-1', status: captureStatus as 'COMPLETED', amount: { currency_code: 'USD', value }, custom_id: paymentId }] },
    }],
    ...over,
  };
}

function setup(planOverrides: Record<string, Partial<Row>> = {}) {
  const db = makeDb(planOverrides);
  const config: any = { get: () => ({ minPaidAmountCents: 1 }) };
  const plans = new PlansService(db.prisma, config);
  const paypal: any = {
    isConfigured: jest.fn(() => true),
    publicConfig: () => ({ enabled: true, clientId: 'public-client-id', environment: 'sandbox' }),
    createOrder: jest.fn(async () => ({ id: 'ORDER-1', status: 'CREATED' })),
    captureOrder: jest.fn(),
    getOrder: jest.fn(),
  };
  const email: any = { sendSubscriptionSuccess: jest.fn(async () => undefined) };
  const svc = new PaymentsService(db.prisma, plans, paypal, email);
  return { ...db, svc, paypal, email, planSvc: plans };
}

describe('formatAmount', () => {
  it('formats cents without float rounding', () => {
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(5)).toBe('0.05');
    expect(formatAmount(1299)).toBe('12.99');
    expect(formatAmount(100000)).toBe('1000.00');
  });
});

describe('PlansService.checkoutMode', () => {
  const { planSvc, plans } = setup();
  it.each([
    ['pilot plan at $0', plans.family, 'pilot'],
    ['free tier', plans.free, 'free'],
    ['$0 plan that is not self-serve', plans.district, 'contact'],
    ['priced plan', plans.school, 'paypal'],
    ['inactive plan', { ...plans.school, active: false }, 'unavailable'],
  ])('%s', (_label, plan, mode) => expect(planSvc.checkoutMode(plan as any)).toBe(mode));

  it('keeps a plan priced under the configured minimum out of checkout', () => {
    const db = makeDb();
    const svc = new PlansService(db.prisma, { get: () => ({ minPaidAmountCents: 100 }) } as any);
    expect(svc.checkoutMode({ ...db.plans.school, priceCents: 50 } as any)).toBe('unavailable');
    expect(svc.checkoutMode({ ...db.plans.family, priceCents: 0 } as any)).toBe('pilot');
  });
});

describe('PaymentsService — $0 pilot activation', () => {
  it('activates the plan, records a pilot payment, and never calls PayPal', async () => {
    const t = setup();
    const res = await t.svc.activatePlan('u1', 'family');

    expect(res).toMatchObject({ status: 'ACTIVE', plan: 'family', provider: 'pilot', alreadyActive: false });
    expect(t.subs.get('u1')).toMatchObject({ plan: 'family', status: 'active', provider: 'pilot', renewsAt: null });
    const [payment] = [...t.payments.values()];
    expect(payment).toMatchObject({ provider: 'pilot', status: 'succeeded', amountCents: 0, currency: 'USD', plan: 'family' });
    expect(t.paypal.createOrder).not.toHaveBeenCalled();
    expect(t.paypal.captureOrder).not.toHaveBeenCalled();
    expect(t.prisma.$queryRaw).toHaveBeenCalled(); // per-user lock taken
  });

  it('is idempotent: a second click changes nothing', async () => {
    const t = setup();
    await t.svc.activatePlan('u1', 'family');
    const again = await t.svc.activatePlan('u1', 'family');
    expect(again.alreadyActive).toBe(true);
    expect(t.payments.size).toBe(1);
    expect(t.email.sendSubscriptionSuccess).toHaveBeenCalledTimes(1);
  });

  it('activates the free tier without recording a payment', async () => {
    const t = setup();
    const res = await t.svc.activatePlan('u1', 'free');
    expect(res).toMatchObject({ plan: 'free', provider: null });
    expect(t.payments.size).toBe(0);
  });

  it('refuses to activate a priced plan for free', async () => {
    const t = setup();
    await expect(t.svc.activatePlan('u1', 'school')).rejects.toThrow(new BadRequestException(MESSAGES.paymentRequired));
    expect(t.subs.size).toBe(0);
  });

  it('refuses a $0 plan that is not self-serve', async () => {
    const t = setup();
    await expect(t.svc.activatePlan('u1', 'district')).rejects.toThrow(PLAN_UNAVAILABLE);
  });

  it('refuses an inactive plan', async () => {
    const t = setup({ family: { active: false } });
    await expect(t.svc.activatePlan('u1', 'family')).rejects.toThrow(PLAN_UNAVAILABLE);
  });
});

describe('PaymentsService — PayPal order creation', () => {
  it('charges the price from the Plan table', async () => {
    const t = setup();
    const res = await t.svc.createPaypalOrder('u1', 'school');

    expect(res).toEqual({ orderId: 'ORDER-1', plan: 'school', amount: '5.00', currency: 'USD' });
    const [payment] = [...t.payments.values()];
    expect(payment).toMatchObject({ provider: 'paypal', status: 'pending', amountCents: 500, externalId: 'ORDER-1', userId: 'u1' });
    expect(t.paypal.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      requestId: payment.id, customId: payment.id, amount: { currency_code: 'USD', value: '5.00' },
    }));
  });

  it('does not create a PayPal order for a $0 plan', async () => {
    const t = setup();
    await expect(t.svc.createPaypalOrder('u1', 'family')).rejects.toThrow(MESSAGES.noPaymentNeeded);
    expect(t.paypal.createOrder).not.toHaveBeenCalled();
    expect(t.payments.size).toBe(0);
  });

  it('answers 503 when PayPal is not configured', async () => {
    const t = setup();
    t.paypal.isConfigured.mockReturnValue(false);
    await expect(t.svc.createPaypalOrder('u1', 'school')).rejects.toThrow(ServiceUnavailableException);
  });

  it('marks the payment failed and hides PayPal details when PayPal is down', async () => {
    const t = setup();
    t.paypal.createOrder.mockRejectedValue(new PaypalApiError(500, 'INTERNAL_SERVER_ERROR', 'dbg-1', 'secret detail'));
    const err = await t.svc.createPaypalOrder('u1', 'school').catch((e: Error) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as Error).message).toBe(MESSAGES.paypalUnavailable);
    expect([...t.payments.values()][0].status).toBe('failed');
  });

  it('switches flow when only the price changes — no code path differs', async () => {
    const pilot = setup({ school: { priceCents: 0, pilotEnabled: true } });
    await expect(pilot.svc.activatePlan('u1', 'school')).resolves.toMatchObject({ provider: 'pilot' });

    const paid = setup({ school: { priceCents: 2500 } });
    await expect(paid.svc.createPaypalOrder('u1', 'school')).resolves.toMatchObject({ amount: '25.00' });
  });
});

describe('PaymentsService — PayPal capture', () => {
  async function withOrder() {
    const t = setup();
    await t.svc.createPaypalOrder('u1', 'school');
    const payment = [...t.payments.values()][0];
    return { ...t, payment };
  }

  it('captures, verifies, and activates the subscription for one period', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockResolvedValue(completedOrder(t.payment.id));
    const before = Date.now();

    const res = await t.svc.capturePaypalOrder('u1', 'ORDER-1');

    expect(res).toMatchObject({ status: 'ACTIVE', plan: 'school', provider: 'paypal', alreadyActive: false });
    expect(t.paypal.captureOrder).toHaveBeenCalledWith('ORDER-1', `capture-${t.payment.id}`);
    expect(t.payments.get(t.payment.id)).toMatchObject({ status: 'succeeded', providerCaptureId: 'CAPTURE-1' });
    const sub = t.subs.get('u1')!;
    expect(sub).toMatchObject({ plan: 'school', status: 'active', provider: 'paypal', externalId: 'ORDER-1' });
    expect(sub.renewsAt.getTime() - before).toBeGreaterThanOrEqual(30 * 864e5 - 1000);
    expect(t.email.sendSubscriptionSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not activate twice when capture is called again', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockResolvedValue(completedOrder(t.payment.id));
    await t.svc.capturePaypalOrder('u1', 'ORDER-1');
    const renewsAt = t.subs.get('u1')!.renewsAt;

    const again = await t.svc.capturePaypalOrder('u1', 'ORDER-1');

    expect(again.alreadyActive).toBe(true);
    expect(t.paypal.captureOrder).toHaveBeenCalledTimes(1);
    expect(t.subs.get('u1')!.renewsAt).toBe(renewsAt);
    expect(t.email.sendSubscriptionSuccess).toHaveBeenCalledTimes(1);
  });

  it("will not capture another user's order", async () => {
    const t = await withOrder();
    await expect(t.svc.capturePaypalOrder('intruder', 'ORDER-1')).rejects.toThrow(NotFoundException);
    expect(t.paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('rejects a capture whose amount does not match the order', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockResolvedValue(completedOrder(t.payment.id, '0.01'));
    await expect(t.svc.capturePaypalOrder('u1', 'ORDER-1')).rejects.toThrow(MESSAGES.paymentFailed);
    expect(t.payments.get(t.payment.id)!.status).toBe('failed');
    expect(t.subs.size).toBe(0);
  });

  it('rejects a capture that belongs to a different payment', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockResolvedValue(completedOrder('pay_someone_else'));
    await expect(t.svc.capturePaypalOrder('u1', 'ORDER-1')).rejects.toThrow(MESSAGES.paymentFailed);
    expect(t.subs.size).toBe(0);
  });

  it('waits for the money when PayPal holds the capture for review', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockResolvedValue(completedOrder(t.payment.id, '5.00', {}, 'PENDING'));
    const res = await t.svc.capturePaypalOrder('u1', 'ORDER-1');
    expect(res.status).toBe('PENDING');
    expect(t.payments.get(t.payment.id)).toMatchObject({ status: 'pending', providerCaptureId: 'CAPTURE-1' });
    expect(t.subs.size).toBe(0);
  });

  it('recovers an order PayPal already captured', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockRejectedValue(new PaypalApiError(422, 'ORDER_ALREADY_CAPTURED', 'dbg', 'already'));
    t.paypal.getOrder.mockResolvedValue(completedOrder(t.payment.id));
    await expect(t.svc.capturePaypalOrder('u1', 'ORDER-1')).resolves.toMatchObject({ status: 'ACTIVE', plan: 'school' });
  });

  it('marks a declined payment failed without activating', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockRejectedValue(new PaypalApiError(422, 'INSTRUMENT_DECLINED', 'dbg', 'declined'));
    await expect(t.svc.capturePaypalOrder('u1', 'ORDER-1')).rejects.toThrow(new BadRequestException(MESSAGES.paymentFailed));
    expect(t.payments.get(t.payment.id)!.status).toBe('failed');
    expect(t.subs.size).toBe(0);
  });

  it('keeps the payment retryable when PayPal is unreachable', async () => {
    const t = await withOrder();
    t.paypal.captureOrder.mockRejectedValue(new PaypalApiError(0, 'NETWORK', undefined, 'timeout'));
    await expect(t.svc.capturePaypalOrder('u1', 'ORDER-1')).rejects.toThrow(ServiceUnavailableException);
    expect(t.payments.get(t.payment.id)!.status).toBe('pending');
  });

  it('records a cancelled checkout and does not activate', async () => {
    const t = await withOrder();
    await expect(t.svc.cancelPaypalOrder('u1', 'ORDER-1')).resolves.toEqual({ cancelled: true });
    expect(t.payments.get(t.payment.id)!.status).toBe('cancelled');
    expect(t.subs.size).toBe(0);
    await expect(t.svc.cancelPaypalOrder('intruder', 'ORDER-1')).resolves.toEqual({ cancelled: false });
  });
});

describe('PaymentsService.catalog', () => {
  it('lists plans with their checkout mode and only the public PayPal client id', async () => {
    const t = setup();
    const res = await t.svc.catalog();
    expect(res.plans.map((p) => [p.id, p.checkout, p.price])).toEqual([
      ['free', 'free', '0.00'], ['family', 'pilot', '0.00'], ['school', 'paypal', '5.00'], ['district', 'contact', '0.00'],
    ]);
    expect(JSON.stringify(res)).not.toMatch(/secret/i);
  });
});
