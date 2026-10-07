import { analytics, sanitizeProps } from '@/features/analytics/track';

describe('analytics privacy', () => {
  beforeEach(() => analytics._reset());

  it('drops non-allow-listed and non-primitive properties', () => {
    expect(
      sanitizeProps({ lessonId: 'l1', name: 'Charles Abebe', email: 'a@b.c', answer: 'secret', percent: 90, nested: { a: 1 }, passed: true }),
    ).toEqual({ lessonId: 'l1', percent: 90, passed: true });
  });

  it('truncates long strings', () => {
    expect(String(sanitizeProps({ kind: 'x'.repeat(200) }).kind).length).toBe(64);
  });

  it('buffers events with sanitized props', () => {
    analytics.track('lesson_completed', { lessonId: 'l1', password: 'nope' });
    const [e] = analytics._peek();
    expect(e?.name).toBe('lesson_completed');
    expect(e?.props).toEqual({ lessonId: 'l1' });
  });
});
