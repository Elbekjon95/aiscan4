import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Allow /admin/login
    if (pathname === '/admin/login') {
      if (session.isLoggedIn) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return res;
    }

    // Protect all other /admin routes
    if (!session.isLoggedIn) {
      const loginUrl = new URL('/admin/login', request.url);
      // Preserve language and other query params
      request.nextUrl.searchParams.forEach((value, key) => {
        loginUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
