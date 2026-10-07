import { useLocalSearchParams } from 'expo-router';

import { QuizRunner } from '@/features/lesson/QuizRunner';

export default function QuizScreen() {
  const { id = '', lessonId, courseId } = useLocalSearchParams<{ id: string; lessonId?: string; courseId?: string }>();
  return <QuizRunner quizId={id} lessonId={lessonId} courseId={courseId} />;
}
