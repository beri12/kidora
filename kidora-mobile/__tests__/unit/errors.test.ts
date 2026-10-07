import { ApiError, extractServerMessages, fromHttpResponse, kindFromStatus } from '@/lib/errors';

describe('centralised error handling', () => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation'],
    [400, 'validation'],
    [429, 'rate_limited'],
    [500, 'server'],
    [503, 'server'],
  ])('maps %i to %s', (status, kind) => {
    expect(kindFromStatus(status)).toBe(kind);
  });

  it('reads NestJS AllExceptionsFilter bodies', () => {
    expect(extractServerMessages({ statusCode: 400, error: { message: ['email must be an email', 'x'] } })).toEqual(['email must be an email', 'x']);
    expect(extractServerMessages({ statusCode: 401, error: 'MFA_REQUIRED' })).toEqual(['MFA_REQUIRED']);
    expect(extractServerMessages(null)).toEqual([]);
  });

  it('never exposes 5xx internals', () => {
    const e = fromHttpResponse(500, { statusCode: 500, error: 'PrismaClientKnownRequestError: stack trace…' });
    expect(e.kind).toBe('server');
    expect(e.serverMessage).toBeNull();
    expect(e.messageKey).toBe('errors.server');
  });

  it('keeps user-correctable 4xx messages', () => {
    const e = fromHttpResponse(400, { statusCode: 400, error: { message: 'Daily limit of 30 questions reached.' } });
    expect(e.serverMessage).toBe('Daily limit of 30 questions reached.');
    expect(e.retryable).toBe(false);
  });

  it('marks transient failures retryable', () => {
    expect(new ApiError('network', null).retryable).toBe(true);
    expect(new ApiError('timeout', null).retryable).toBe(true);
    expect(new ApiError('rate_limited', 429).retryable).toBe(true);
    expect(new ApiError('forbidden', 403).retryable).toBe(false);
  });
});
