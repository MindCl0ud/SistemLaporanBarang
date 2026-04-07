import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user as any;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = nextUrl.pathname === "/login";

  if (isApiAuthRoute) return NextResponse.next();

  if (isPublicRoute) {
    if (isLoggedIn) {
      // Redirect to specific dashboard based on role if already logged in
      const role = user.role;
      if (role === "ADMIN_GUDANG") return NextResponse.redirect(new URL("/admin", nextUrl));
      if (role === "KEPALA_DINAS") return NextResponse.redirect(new URL("/eksekutif", nextUrl));
      return NextResponse.redirect(new URL("/pegawai", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Role-based route protection - only if logged in
  if (isLoggedIn && user) {
    if (nextUrl.pathname.startsWith("/admin") && user.role !== "ADMIN_GUDANG") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    if (nextUrl.pathname.startsWith("/eksekutif") && user.role !== "KEPALA_DINAS") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    if (nextUrl.pathname.startsWith("/pegawai") && user.role !== "PEGAWAI") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
