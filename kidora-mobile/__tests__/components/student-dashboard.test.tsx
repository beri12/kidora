import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { StudentDashboard } from '@/features/student/StudentDashboard';
import { gameService } from '@/services/game.service';
import { recommendationService } from '@/services/recommendation.service';
import { studentService } from '@/services/student.service';
import { renderWithProviders } from '@/test-utils/render';
import { studentDashboard, world } from '@/test-utils/fixtures';

jest.mock('@/services/student.service', () => ({ studentService: { dashboard: jest.fn(), claimQuest: jest.fn() } }));
jest.mock('@/services/recommendation.service', () => ({
  ...jest.requireActual('@/services/recommendation.service'),
  recommendationService: { forStudent: jest.fn() },
}));
jest.mock('@/services/game.service', () => ({ ...jest.requireActual('@/services/game.service'), gameService: { world: jest.fn() } }));

describe('Student dashboard', () => {
  beforeEach(() => {
    jest.mocked(studentService.dashboard).mockResolvedValue(studentDashboard);
    jest.mocked(recommendationService.forStudent).mockRejectedValue(new Error('404'));
    jest.mocked(gameService.world).mockResolvedValue(world);
  });

  it('greets the student and shows level, XP and streak', async () => {
    await renderWithProviders(<StudentDashboard />);
    expect(await screen.findByText(/Charles! 👋/)).toBeTruthy();
    expect(screen.getAllByText('Level 7').length).toBeGreaterThan(0);
    expect(screen.getByText("You're 620 XP away from Level 8.")).toBeTruthy();
    expect(screen.getByText('6-day streak')).toBeTruthy();
  });

  it('shows continue learning and opens the current lesson', async () => {
    await renderWithProviders(<StudentDashboard />);
    const button = await screen.findByTestId('continue-button');
    await fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith('/(student)/lesson/l4?courseId=c1');
  });

  it('falls back to local recommendations when the API has none', async () => {
    await renderWithProviders(<StudentDashboard />);
    expect(await screen.findByText('Recommended for you')).toBeTruthy();
    expect(screen.getByText('Continue Quarters all around')).toBeTruthy();
  });

  it('shows daily challenge, Kai, achievements and leaderboard', async () => {
    await renderWithProviders(<StudentDashboard />);
    expect(await screen.findByText('Daily challenge')).toBeTruthy();
    expect(screen.getByText('Ask Kai')).toBeTruthy();
    expect(screen.getByText('First Steps')).toBeTruthy();
    expect(screen.getByText('Charles (You)')).toBeTruthy();
  });

  it('renders a friendly error with retry', async () => {
    const { ApiError } = jest.requireActual('@/lib/errors');
    jest.mocked(studentService.dashboard).mockRejectedValue(new ApiError('network', null));
    await renderWithProviders(<StudentDashboard />);
    expect(await screen.findByText("We couldn't connect to Kidora. Check your internet connection and try again.")).toBeTruthy();
    jest.mocked(studentService.dashboard).mockResolvedValue(studentDashboard);
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText(/Charles! 👋/)).toBeTruthy());
  });
});
