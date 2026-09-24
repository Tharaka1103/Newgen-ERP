import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as { role?: string })?.role;

  const isAuthPage = nextUrl.pathname.startsWith("/login");
  const isDashboardPage = nextUrl.pathname.startsWith("/dashboard");

  // Determine role home path
  const getRoleHome = (userRole?: string) => {
    switch (userRole) {
      case "ADMIN":
        return "/dashboard/admin/dashboard";
      case "VERIFIER":
        return "/dashboard/verifier/dashboard";
      case "STAFF":
      default:
        return "/dashboard/staff/dashboard";
    }
  };

  // 1. If user is logged in and visits /login, redirect to their role dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
  }

  // 2. If unauthenticated user tries to access /dashboard, redirect to /login
  if (!isLoggedIn && isDashboardPage) {
    const redirectUrl = new URL("/login", nextUrl);
    redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Root /dashboard redirect to specific role dashboard
  if (isLoggedIn && (nextUrl.pathname === "/dashboard" || nextUrl.pathname === "/dashboard/")) {
    return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
  }

  // 4. Role-based path guarding
  if (isLoggedIn && isDashboardPage) {
    if (nextUrl.pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
    }
    if (nextUrl.pathname.startsWith("/dashboard/verifier") && role !== "VERIFIER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
    }
    if (nextUrl.pathname.startsWith("/dashboard/staff") && role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
