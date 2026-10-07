import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import ParentDashboardScreen from '@/app/(parent)/dashboard';
import TeacherDashboardScreen from '@/app/(teacher)/dashboard';
import { parentService } from '@/services/parent.service';
import { teacherService } from '@/services/teacher.service';
import { useUserStore } from '@/store/userStore';
import { parentDashboard, teacherDashboard } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('@/services/parent.service', () => ({ parentService: { dashboard: jest.fn() } }));
jest.mock('@/services/teacher.service', () => ({ teacherService: { dashboard: jest.fn() } }));

describe('Parent dashboard', () => {
  beforeEach(() => {
    useUserStore.setState({ selectedChildId: null });
    jest.mocked(parentService.dashboard).mockImplementation(async (childId) => ({ ...parentDashboard, selectedChildId: childId ?? 'k1' }));
  });

  it('shows children, KPIs, strengths and areas needing improvement', async () => {
    await renderWithProviders(<ParentDashboardScreen />);
    expect(await screen.findByText('Learning progress')).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('84%')).toBeTruthy();
    expect(screen.getByText('Halves')).toBeTruthy();
    expect(screen.getByText('Comparing fractions')).toBeTruthy();
  });

  it('switches child and refetches for that child only', async () => {
    await renderWithProviders(<ParentDashboardScreen />);
    await fireEvent.press(await screen.findByLabelText('Mahlet'));
    expect(useUserStore.getState().selectedChildId).toBe('k2');
    await screen.findByText('Learning progress');
    expect(parentService.dashboard).toHaveBeenLastCalledWith('k2', 'week');
  });
});

describe('Teacher dashboard', () => {
  beforeEach(() => jest.mocked(teacherService.dashboard).mockResolvedValue(teacherDashboard));

  it('shows totals, pending grading and classes', async () => {
    await renderWithProviders(<TeacherDashboardScreen />);
    expect(await screen.findByText('84')).toBeTruthy();
    expect(screen.getByText('Pending grading')).toBeTruthy();
    expect(screen.getByText('5A Maths')).toBeTruthy();
    expect(screen.getByText('2 at risk')).toBeTruthy();
  });

  it('drills down into a class', async () => {
    await renderWithProviders(<TeacherDashboardScreen />);
    await fireEvent.press(await screen.findByLabelText(/5A Maths/));
    expect(router.push).toHaveBeenCalledWith('/(teacher)/class/k1');
  });
});
