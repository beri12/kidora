import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import AiTutor from '@/app/(student)/ai-tutor';
import { aiService } from '@/services/ai.service';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('@/services/ai.service', () => ({ aiService: { ask: jest.fn(), history: jest.fn(), report: jest.fn() } }));

describe('AI Tutor (Kai)', () => {
  beforeEach(() => {
    jest.mocked(aiService.history).mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 });
    jest.mocked(aiService.ask).mockResolvedValue({
      reply: { id: 'r1', role: 'assistant', content: 'A quarter is one of four equal parts.', createdAt: '' },
      remainingToday: 29,
    });
  });

  it('greets, sends a question through the backend and shows the reply', async () => {
    await renderWithProviders(<AiTutor />);
    expect(await screen.findByText("Hi! I'm Kai 🦊. Ask me anything about your lessons!")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('ai-input'), 'What is a quarter?');
    await fireEvent.press(screen.getByTestId('ai-ask'));
    expect(await screen.findByText('A quarter is one of four equal parts.')).toBeTruthy();
    expect(aiService.ask).toHaveBeenCalledWith({ message: 'What is a quarter?', kind: 'TUTOR', lessonId: undefined, courseId: undefined });
    expect(screen.getByText('29 questions left today')).toBeTruthy();
  });

  it('quick prompts map to tutor kinds', async () => {
    await renderWithProviders(<AiTutor />);
    await fireEvent.press(await screen.findByLabelText('Give me a hint'));
    await waitFor(() => expect(aiService.ask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'HINT', message: 'Give me a hint' })));
  });

  it('shows the child-safety notice and a report action on replies', async () => {
    await renderWithProviders(<AiTutor />);
    expect(await screen.findByText(/Kai only helps with learning/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('ai-input'), 'Hi');
    await fireEvent.press(screen.getByTestId('ai-ask'));
    await screen.findByText('A quarter is one of four equal parts.');
    expect(screen.getAllByText('Report this answer').length).toBeGreaterThan(0);
  });
});
