import { CoursePreviewPage } from "@/features/studio/CoursePreview";
export const metadata = { title: "Preview · Kidora" };
export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CoursePreviewPage courseId={courseId} />;
}
