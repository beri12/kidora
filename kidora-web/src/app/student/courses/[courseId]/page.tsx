import { StudentCoursePage } from "@/features/learning/CourseDetail";
export const metadata = { title: "Course · Kidora" };
export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <StudentCoursePage courseId={courseId} />;
}
