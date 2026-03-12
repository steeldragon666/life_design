import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  response.headers.set('x-pathname', pathname);

  // Protected routes that require onboarding
  const protectedRoutes = [
    '/dashboard',
    '/goals',
    '/meditations',
    '/checkin',
    '/insights',
    '/profile',
    '/settings',
    '/mentors',
  ];

  // Auth routes that should redirect if already onboarded
  const authRoutes = ['/login', '/signup'];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboarding = pathname.startsWith('/onboarding');

  // Note: We can't access localStorage in middleware (server-side)
  // So we rely on client-side checks in page components
  // This middleware just sets headers for now
  // For full protection, consider using cookies or a session token

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
