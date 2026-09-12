import { redirect } from "next/navigation";

/**
 * The teacher dashboard moved to /teacher/dashboard, which reads real figures
 * from the API. What stood here showed hardcoded ones. Kept as a redirect so
 * old links and bookmarks still land somewhere useful.
 */
export default function Page() {
  redirect("/teacher/dashboard");
}
