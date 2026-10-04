import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentsConfig, PaypalConfig, PaypalEnvironment } from '../config/payments.config';

// Thin client for the PayPal Orders v2 REST API. It knows nothing about
// Kidora plans or users — PaymentsService decides what to charge and what a
// capture unlocks. The client secret and access tokens never leave this file
// and are never logged.

export interface PaypalAmount { currency_code: string; value: string }

export interface PaypalCapture {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  amount: PaypalAmount;
  custom_id?: string;
}

export interface PaypalPurchaseUnit {
  reference_id?: string;
  custom_id?: string;
  amount?: PaypalAmount;
  payments?: { captures?: PaypalCapture[] };
}

export interface PaypalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  purchase_units?: PaypalPurchaseUnit[];
}

export interface CreatePaypalOrderInput {
  /** Sent as PayPal-Request-Id, so a retried create returns the same order. */
  requestId: string;
  /** Echoed back on the capture; we use the Kidora Payment id. */
  customId: string;
  referenceId: string;
  description: string;
  amount: PaypalAmount;
}

/**
 * A PayPal API failure. `issue` is PayPal's machine-readable reason
 * (INSTRUMENT_DECLINED, ORDER_ALREADY_CAPTURED, ...); `debugId` is what PayPal
 * support asks for. Neither contains credentials.
 */
export class PaypalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly issue: string | undefined,
    public readonly debugId: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'PaypalApiError';
  }
}

interface PaypalErrorBody {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string }[];
  error?: string;
  error_description?: string;
}

const TIMEOUT_MS = 15_000;

@Injectable()
export class PaypalService implements OnModuleInit {
  private logger = new Logger('PayPal');
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private config: ConfigService) {}

  private get settings(): PaypalConfig {
    return this.config.get<PaymentsConfig>('payments')!.paypal;
  }

  onModuleInit() {
    const s = this.settings;
    if (s.environmentRaw && !s.environment) {
      this.logger.error(`PAYPAL_ENVIRONMENT="${s.environmentRaw}" is not recognised (use sandbox or production). PayPal checkout is off.`);
    } else if (!this.isConfigured()) {
      this.logger.log('PayPal checkout is off (set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET). $0 pilot plans still work.');
    } else {
      this.logger.log(`PayPal checkout: ${s.environment} (${s.apiBaseUrl})`);
    }
  }

  isConfigured(): boolean {
    const s = this.settings;
    return Boolean(s.clientId && s.clientSecret && s.environment);
  }

  /** Safe to hand to the browser: the client id is public by design. */
  publicConfig(): { enabled: boolean; clientId: string | null; environment: PaypalEnvironment | null } {
    const enabled = this.isConfigured();
    return { enabled, clientId: enabled ? this.settings.clientId : null, environment: enabled ? this.settings.environment : null };
  }

  createOrder(input: CreatePaypalOrderInput): Promise<PaypalOrder> {
    return this.call<PaypalOrder>('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: input.referenceId,
        custom_id: input.customId,
        description: input.description,
        amount: input.amount,
      }],
      application_context: { brand_name: 'Kidora', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
    }, input.requestId);
  }

  /** Idempotent per requestId: a repeated call returns PayPal's first answer. */
  captureOrder(orderId: string, requestId: string): Promise<PaypalOrder> {
    return this.call<PaypalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, requestId);
  }

  getOrder(orderId: string): Promise<PaypalOrder> {
    return this.call<PaypalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown, requestId?: string, retried = false): Promise<T> {
    const token = await this.accessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    if (requestId) headers['PayPal-Request-Id'] = requestId;

    const res = await this.fetch(`${this.settings.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // A token can be revoked before its stated expiry; fetch a new one once.
    if (res.status === 401 && !retried) {
      this.token = null;
      return this.call<T>(method, path, body, requestId, true);
    }
    if (!res.ok) throw await this.toError(res, `${method} ${path}`);
    return (await res.json()) as T;
  }

  private async accessToken(): Promise<string> {
    if (!this.isConfigured()) throw new PaypalApiError(503, 'NOT_CONFIGURED', undefined, 'PayPal is not configured');
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;

    const { clientId, clientSecret, apiBaseUrl } = this.settings;
    const res = await this.fetch(`${apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      // Bad or revoked credentials are an operator problem, never the buyer's:
      // report it as an outage so checkout says "temporarily unavailable".
      const err = await this.toError(res, 'POST /v1/oauth2/token');
      throw new PaypalApiError(503, 'AUTH_FAILED', err.debugId, err.message);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    // Renew a minute early so a token never expires mid-request.
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  private async fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      throw new PaypalApiError(0, 'NETWORK', undefined, `PayPal unreachable: ${(e as Error).message}`);
    }
  }

  private async toError(res: Response, what: string): Promise<PaypalApiError> {
    let body: PaypalErrorBody = {};
    try { body = (await res.json()) as PaypalErrorBody; } catch { /* non-JSON error page */ }
    const issue = body.details?.[0]?.issue ?? body.name ?? body.error;
    const debugId = body.debug_id ?? res.headers.get('paypal-debug-id') ?? undefined;
    // Logged for operators; never forwarded to the browser.
    this.logger.warn(`${what} -> ${res.status} ${issue ?? ''} debug_id=${debugId ?? 'n/a'}`);
    return new PaypalApiError(res.status, issue, debugId, body.message ?? body.error_description ?? `PayPal ${res.status}`);
  }
}
