import { PaypalApiError, PaypalService } from './paypal.service';
import paymentsConfig from '../config/payments.config';

function serviceFor(env: Record<string, string | undefined>) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const cfg = paymentsConfig();
  process.env = saved;
  return new PaypalService({ get: () => cfg } as any);
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

describe('payments config', () => {
  const base = { PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'shh', PAYPAL_MODE: undefined };
  it('resolves the REST host from PAYPAL_ENVIRONMENT', () => {
    expect(serviceFor({ ...base, PAYPAL_ENVIRONMENT: 'sandbox' }).publicConfig()).toEqual({ enabled: true, clientId: 'id', environment: 'sandbox' });
    expect(serviceFor({ ...base, PAYPAL_ENVIRONMENT: 'production' }).publicConfig().environment).toBe('production');
  });
  it('turns PayPal off rather than guessing on an unknown environment', () => {
    expect(serviceFor({ ...base, PAYPAL_ENVIRONMENT: 'prod' }).isConfigured()).toBe(false);
  });
  it('is off without credentials', () => {
    expect(serviceFor({ PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_ENVIRONMENT: 'sandbox' }).publicConfig()).toEqual({ enabled: false, clientId: null, environment: null });
  });
});

describe('PaypalService REST calls', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock as unknown as typeof fetch; });
  afterAll(() => { global.fetch = realFetch; });

  const svc = () => serviceFor({ PAYPAL_CLIENT_ID: 'client-id', PAYPAL_CLIENT_SECRET: 'client-secret', PAYPAL_ENVIRONMENT: 'sandbox' });

  it('creates a CAPTURE order on the sandbox host with an idempotency key, reusing one token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(json(201, { id: 'ORDER-1', status: 'CREATED' }))
      .mockResolvedValueOnce(json(200, { id: 'ORDER-1', status: 'COMPLETED' }));
    const s = svc();

    await s.createOrder({ requestId: 'pay_1', customId: 'pay_1', referenceId: 'family', description: 'Kidora', amount: { currency_code: 'USD', value: '5.00' } });
    await s.captureOrder('ORDER-1', 'capture-pay_1');

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    expect(tokenInit.headers.Authorization).toBe(`Basic ${Buffer.from('client-id:client-secret').toString('base64')}`);

    const [orderUrl, orderInit] = fetchMock.mock.calls[1];
    expect(orderUrl).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
    expect(orderInit.headers['PayPal-Request-Id']).toBe('pay_1');
    expect(JSON.parse(orderInit.body)).toMatchObject({ intent: 'CAPTURE', purchase_units: [{ custom_id: 'pay_1', amount: { value: '5.00' } }] });

    expect(fetchMock.mock.calls[2][0]).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-1/capture');
    expect(fetchMock.mock.calls[2][1].headers['PayPal-Request-Id']).toBe('capture-pay_1');
    expect(fetchMock).toHaveBeenCalledTimes(3); // token fetched once
  });

  it('turns a PayPal error into a PaypalApiError carrying the issue and debug id, not the secret', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(json(422, { name: 'UNPROCESSABLE_ENTITY', debug_id: 'abc123', details: [{ issue: 'INSTRUMENT_DECLINED' }] }));
    const err = await svc().captureOrder('ORDER-1', 'r').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PaypalApiError);
    expect(err).toMatchObject({ status: 422, issue: 'INSTRUMENT_DECLINED', debugId: 'abc123' });
    expect(JSON.stringify(err) + String(err)).not.toContain('client-secret');
  });

  it('treats rejected credentials as an outage, not a buyer error', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: 'invalid_client', error_description: 'Client Authentication failed' }));
    await expect(svc().getOrder('ORDER-1')).rejects.toMatchObject({ status: 503, issue: 'AUTH_FAILED' });
  });

  it('reports a network failure as status 0', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(svc().getOrder('ORDER-1')).rejects.toMatchObject({ status: 0, issue: 'NETWORK' });
  });

  it('refuses to call PayPal when not configured', async () => {
    const s = serviceFor({ PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_ENVIRONMENT: 'sandbox' });
    await expect(s.getOrder('ORDER-1')).rejects.toMatchObject({ status: 503, issue: 'NOT_CONFIGURED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
