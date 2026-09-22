import { CourseStudioPage } from "@/features/studio/CourseStudio";
export const metadata = { title: "Course studio · Kidora" };
export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseStudioPage courseId={courseId} />;
}
