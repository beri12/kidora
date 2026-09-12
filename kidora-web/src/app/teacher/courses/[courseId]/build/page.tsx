import { CourseBuilderPage } from "@/features/course-builder/CourseBuilder";
export const metadata = { title: "Course builder · Kidora" };
export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseBuilderPage courseId={courseId} />;
}
