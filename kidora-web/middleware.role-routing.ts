/**
 * Role-aware routing for /student, /teacher, /school, /parent.
 * MERGE into your existing middleware.ts — this only shows the role branch.
 * Adapt `readRole()` to how your app stores the session (cookie name, JWT claim).
 * The backend still enforces authorization; this is UX-level redirection only.
 */
import { NextResponse, type NextRequest } from "next/server";

type Role = "CHILD" | "PARENT" | "TEACHER" | "SCHOOL_ADMIN" | "SCHOOL_LEADER" | "DISTRICT_ADMIN" | "SUPER_ADMIN" | "ADMIN";

const AREA: Record<string, Role[]> = {
  "/student": ["CHILD"],
  "/teacher": ["TEACHER"],
  "/school": ["SCHOOL_ADMIN", "SCHOOL_LEADER", "DISTRICT_ADMIN", "SUPER_ADMIN", "ADMIN"],
  "/parent": ["PARENT"],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  CHILD: "/student/dashboard", PARENT: "/parent/dashboard", TEACHER: "/teacher/dashboard",
  SCHOOL_ADMIN: "/school/dashboard", SCHOOL_LEADER: "/school/dashboard", DISTRICT_ADMIN: "/school/dashboard",
  SUPER_ADMIN: "/school/dashboard", ADMIN: "/school/dashboard",
};

function readRole(req: NextRequest): Role | null {
  // Example: role stored in a non-httpOnly cookie set at login. Replace with your JWT decode if needed.
  const r = req.cookies.get("kidora_role")?.value as Role | undefined;
  return r ?? null;
}

export function roleGuard(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;
  const area = Object.keys(AREA).find((a) => path === a || path.startsWith(a + "/"));
  if (!area) return null;
  const role = readRole(req);
  if (!role) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (!AREA[area].includes(role)) {
    const url = req.nextUrl.clone(); url.pathname = HOME_BY_ROLE[role]; url.searchParams.set("forbidden", "1");
    return NextResponse.redirect(url);
  }
  return null;
}

// In your middleware.ts:
// export function middleware(req: NextRequest) { return roleGuard(req) ?? NextResponse.next(); }
// export const config = { matcher: ["/student/:path*", "/teacher/:path*", "/school/:path*", "/parent/:path*"] };
