import { LessonPlayerPage } from "@/features/learning/LessonPlayer";
export const metadata = { title: "Lesson · Kidora" };
export default async function Page({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  return <LessonPlayerPage courseId={courseId} lessonId={lessonId} />;
}
