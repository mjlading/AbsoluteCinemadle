import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE } from "@/lib/admin/session-token";

/**
 * Optimistic check only: sends visitors without an admin cookie to the login
 * page. Every admin page, action and route verifies the session itself.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login" || request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
