import { NextResponse, type NextRequest } from 'next/server';
import { AREA_ROLES, areaFor } from '@/constants';
import type { Role } from '@/types';

/**
 * First line of route protection.
 *
 * It reads the `kidora_role` cookie the auth store writes. That cookie is set
 * by client JavaScript and is therefore forgeable, so this is a navigation aid,
 * not a security boundary: it keeps a signed-out or wrong-role visitor from
 * loading a shell that can only render errors. Authorization is enforced for
 * real by the backend's JwtAuthGuard + RolesGuard on every request the page
 * makes, and again on the client by RequireRole once the store has hydrated.
 *
 * NOTE: this file must sit at src/middleware.ts (or the project root). The
 * previous copy lived at src/app/middleware.ts, which Next never loads — so
 * nothing was protected at all.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const area = areaFor(pathname);
  if (!area) return NextResponse.next();

  const role = req.cookies.get('kidora_role')?.value as Role | undefined;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const allowed = AREA_ROLES[area] ?? [];
  if (!allowed.includes(role)) {
    // Send them to their own area rather than showing a dead end.
    const url = req.nextUrl.clone();
    url.pathname = homeFor(role);
    url.searchParams.set('forbidden', '1');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Duplicated from ROLE_HOME rather than imported, because middleware runs on
 * the edge runtime and importing the constants barrel would pull in the whole
 * client module graph.
 */
function homeFor(role: Role): string {
  switch (role) {
    case 'CHILD': return '/student/dashboard';
    case 'TEACHER': return '/teacher/dashboard';
    case 'PARENT': return '/parent/dashboard';
    case 'SCHOOL_ADMIN':
    case 'SCHOOL_LEADER':
    case 'DISTRICT_ADMIN': return '/school/dashboard';
    case 'ADMIN':
    case 'SUPER_ADMIN': return '/dashboard/admin';
    default: return '/';
  }
}

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/parent/:path*',
    '/school/:path*',
    '/dashboard/admin/:path*',
  ],
};
