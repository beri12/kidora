import { redirect } from 'next/navigation';

// District leaders share the school dashboard (see AREA_ROLES in
// src/constants). This route was an empty file, which is not a valid module
// and failed `next build`; it now forwards so existing links keep working.
export default function Page() {
  redirect('/school/dashboard');
}
