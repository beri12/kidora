import type { ApiErrorKind, BackendErrorBody } from '@/types';

/** i18n keys for every error kind — never show raw backend text for 5xx. */
export const ERROR_MESSAGE_KEYS: Record<ApiErrorKind, string> = {
  unauthorized: 'errors.unauthorized',
  forbidden: 'errors.forbidden',
  not_found: 'errors.notFound',
  conflict: 'errors.conflict',
  validation: 'errors.validation',
  rate_limited: 'errors.rateLimited',
  server: 'errors.server',
  network: 'errors.network',
  timeout: 'errors.timeout',
  offline: 'errors.offline',
  unknown: 'errors.unknown',
};

/**
 * Normalised error thrown by the API client. `serverMessage` is only kept for
 * 4xx responses (user-correctable, e.g. "Daily limit reached"); stack traces
 * and 5xx details are dropped so they can never reach the UI.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly serverMessage: string | null;
  readonly fieldErrors: string[];

  constructor(kind: ApiErrorKind, status: number | null, serverMessage: string | null = null, fieldErrors: string[] = []) {
    super(serverMessage ?? kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.serverMessage = serverMessage;
    this.fieldErrors = fieldErrors;
  }

  get messageKey(): string {
    return ERROR_MESSAGE_KEYS[this.kind];
  }

  /** Whether retrying the same request later could succeed. */
  get retryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'offline' ||
      this.kind === 'server' ||
      this.kind === 'rate_limited'
    );
  }
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Pull the human message out of AllExceptionsFilter's body. */
export function extractServerMessages(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const err = (body as BackendErrorBody).error;
  if (typeof err === 'string') return [err];
  if (err && typeof err === 'object') {
    const m = err.message;
    if (Array.isArray(m)) return m.filter((x): x is string => typeof x === 'string');
    if (typeof m === 'string') return [m];
  }
  return [];
}

export function fromHttpResponse(status: number, body: unknown): ApiError {
  const kind = kindFromStatus(status);
  // Never surface server text for 5xx — it may contain internals.
  if (kind === 'server') return new ApiError(kind, status);
  const messages = extractServerMessages(body);
  return new ApiError(kind, status, messages[0] ?? null, kind === 'validation' ? messages : []);
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError('unknown', null);
}
