import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'jfauto_session';

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/admin/login') &&
    !request.cookies.get(SESSION_COOKIE)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
