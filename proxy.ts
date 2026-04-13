import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  const { pathname } = request.nextUrl;

  // 1. Ochiq yo'nalishlar (Public paths)
  const isPublicPath = 
    pathname === '/admin/login' || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/assets/') || 
    pathname === '/favicon.ico' ||
    pathname === '/header_logo.png';

  // 2. Agar foydalanuvchi tizimga kirmagan bo'lsa va yo'nalish ochiq bo'lmasa -> Loginga
  if (!session.isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/admin/login', request.url);
    // Til va boshqa parametrlarni saqlab qolish
    request.nextUrl.searchParams.forEach((value, key) => {
      loginUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(loginUrl);
  }

  // 3. Agar foylalanuvchi tizimga kirgan bo'lsa va login sahifasiga bormoqchi bo'lsa -> Panelga
  if (session.isLoggedIn && pathname === '/admin/login') {
    const adminUrl = new URL('/admin', request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      adminUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(adminUrl);
  }

  // 4. Aktivlikni yangilash (Idle timeout)
  if (session.isLoggedIn) {
    await session.save();
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|header_logo.png).*)'],
};
