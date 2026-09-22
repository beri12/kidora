import type { ReactNode } from "react";
import { RequireRole } from "@/components/shared/RequireRole";

// The query client and i18n provider are installed once by the root layout
// (src/app/layout.tsx -> <Providers>), so this layout only adds the role gate.
// src/middleware.ts redirects before this renders; RequireRole re-checks
// against the real session, and the backend guards enforce it for real.
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole allow={['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'SUPER_ADMIN', 'ADMIN']}>{children}</RequireRole>;
}
