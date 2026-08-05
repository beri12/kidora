// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ROLE_HOME } from '@/constants';
import type { Role } from '@/types';

const COOKIE_NAME = 'kidora_token'; // change to whatever cookie your login sets
const JWT_SECRET = process.env.JWT_SECRET; // must be set in .env, no NEXT_PUBLIC_ prefix

interface TokenPayload {
  role: Role;
  sub?: string;
  [key: string]: unknown;
}

async function getRoleFromToken(token: string): Promise<Role | null> {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify<TokenPayload>(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return (payload.role as Role) ?? null;
  } catch {
    return null; // expired, tampered, or malformed
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = await getRoleFromToken(token);

  if (!role || !ROLE_HOME[role]) {
    // Token invalid or role unknown, clear the bad cookie and send to login.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const homePath = ROLE_HOME[role]; // e.g. '/dashboard/child'

  // If the path isn't under this role's own dashboard, send them to the right one.
  if (!pathname.startsWith(homePath)) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};