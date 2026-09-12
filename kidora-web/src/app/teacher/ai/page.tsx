import { Suspense } from "react";
import { TeacherAiPage } from "@/features/teacher/TeacherAi";
export const metadata = { title: "AI Teaching Assistant · Kidora" };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TeacherAiPage />
    </Suspense>
  );
}
