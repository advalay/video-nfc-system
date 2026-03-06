import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証不要の公開パス
const PUBLIC_PATHS = ['/login'];

// 静的ファイルパターン
const STATIC_FILE_PATTERN = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイルはそのまま通過
  if (pathname.startsWith('/_next') || STATIC_FILE_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  // 公開パスは認証不要
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Amplify v6のCognito認証Cookie名パターン
  const cookies = request.cookies;
  const hasAuthCookie = Array.from(cookies.getAll()).some(
    (cookie) =>
      cookie.name.includes('CognitoIdentityServiceProvider') &&
      cookie.name.includes('idToken')
  );

  const hasLastAuthUser = Array.from(cookies.getAll()).some(
    (cookie) => cookie.name.includes('LastAuthUser')
  );

  // 認証Cookieが一切ない場合はログインページへリダイレクト
  if (!hasAuthCookie && !hasLastAuthUser) {
    if (pathname === '/' || pathname.startsWith('/organizations') || pathname.startsWith('/shops')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // セキュリティヘッダーを追加
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
