import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/QueryProvider";
// Route protection for /teacher/* lives in middleware.role-routing.ts (merge into your middleware).
export default function Layout({ children }: { children: ReactNode }) { return <QueryProvider>{children}</QueryProvider>; }
