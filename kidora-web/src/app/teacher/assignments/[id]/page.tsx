import { AssignmentDetailPage } from "@/features/teacher/TeacherAssignmentPages";

export const metadata = { title: "Assignment · Kidora" };

// Next 15 hands params in as a promise; the page is a server component that
// unwraps it and passes the id down to the client component that fetches.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetailPage id={id} />;
}
