import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Define role-based route access
    const roleRoutes = {
      '/bank-employee': ['bank_employee'],
      '/third-party-vendor': ['third_party_vendor'],
      '/user': ['user'],
    };

    // Check if route requires specific role
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token?.role || !allowedRoles.includes(token.role as string)) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/bank-employee/:path*',
    '/third-party-vendor/:path*',
    '/user/:path*',
  ],
};
