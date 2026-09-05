import type { ReactNode } from "react";

// The query client and i18n provider are installed once by the root layout
// (src/app/layout.tsx -> <Providers>), so this layout only needs to pass its
// children through. It previously imported "@/providers/QueryProvider", a
// module that does not exist, which broke the production build.
// Route protection for /parent/* lives in middleware.role-routing.ts.
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
