import { fireEvent, render, screen } from '@testing-library/react-native';

import { LeaderboardRow } from '@/components/game/LeaderboardRow';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { XPBar } from '@/components/ui/XPBar';

describe('design system accessibility', () => {
  it('Button is a labelled, disable-aware button', async () => {
    const onPress = jest.fn();
    await render(<Button label="Start" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Start' });
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });

  it('disabled Button does not fire', async () => {
    const onPress = jest.fn();
    await render(<Button label="Start" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ProgressBar exposes progress to screen readers', async () => {
    await render(<ProgressBar value={0.42} accessibilityLabel="Lesson progress" />);
    const bar = screen.getByLabelText('Lesson progress');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('XPBar explains distance to the next level', async () => {
    await render(<XPBar xp={4280} />);
    expect(screen.getByText("You're 620 XP away from Level 8.")).toBeTruthy();
  });

  it('LeaderboardRow shows display names only, with rank and XP', async () => {
    await render(<LeaderboardRow entry={{ rank: 2, userId: 'u', displayName: 'Liya', xp: 580, isMe: false }} />);
    expect(screen.getByLabelText('#2 Liya, 580 XP')).toBeTruthy();
  });
});
