import { categoryFor, routeForPayload } from '@/features/notifications/routing';
import { rewriteIncomingPath } from '@/features/linking/deeplinks';

describe('notification tap routing', () => {
  it('lesson → lesson screen', () => {
    expect(routeForPayload({ type: 'lesson_reminder', lessonId: '123', courseId: 'c9' }, 'STUDENT')).toBe('/(student)/lesson/123?courseId=c9');
  });
  it('achievement → achievements', () => {
    expect(routeForPayload({ type: 'ACHIEVEMENT', achievementId: '456' }, 'STUDENT')).toBe('/(student)/achievements?highlight=456');
  });
  it('assignment → assignments (teacher)', () => {
    expect(routeForPayload({ type: 'ASSIGNMENT_DUE' }, 'TEACHER')).toBe('/(teacher)/assignments');
  });
  it('parent report → child progress', () => {
    expect(routeForPayload({ type: 'parent_report', childId: 'k1' }, 'PARENT')).toBe('/(parent)/progress/k1');
  });
  it('announcement → notifications', () => {
    expect(routeForPayload({ type: 'ANNOUNCEMENT' }, 'SCHOOL_LEADER')).toBe('/modal/notifications');
    expect(routeForPayload({ type: 'ANNOUNCEMENT' }, 'TEACHER')).toBe('/(teacher)/notifications');
  });
  it('never routes a role into another role group', () => {
    expect(routeForPayload({ type: 'ACHIEVEMENT', lessonId: 'x' }, 'PARENT')).not.toContain('(student)');
  });
  it('maps backend types to preference categories', () => {
    expect(categoryFor('LEVEL_UP')).toBe('level_up');
    expect(categoryFor('ASSIGNMENT_GRADED')).toBe('assignment');
    expect(categoryFor('SYSTEM')).toBeNull();
  });
});

describe('deep links', () => {
  it.each([
    ['kidora://lesson/123', '/lesson/123'],
    ['kidora://island/math', '/island/MATH_ISLAND'],
    ['kidora://achievement/456', '/achievements?highlight=456'],
    ['https://justkidora.com/app/lesson/9?courseId=c1', '/lesson/9?courseId=c1'],
    ['/dashboard', '/dashboard'],
  ])('%s → %s', (input, out) => {
    expect(rewriteIncomingPath(input)).toBe(out);
  });
});
