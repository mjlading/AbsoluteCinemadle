import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { errorResponse } from "@/lib/http";
import { ADMIN_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session-token";

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters. See .env.example.");
  }
  return secret;
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  // The expiry check reads the clock, which must happen at request time, never in a prerender.
  await connection();
  return verifySession(token, sessionSecret());
}

/** For pages and server actions: sends anyone who is not signed in to the login page. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** For route handlers: the 401 to return, or null when the caller is the admin. */
export async function adminOnlyResponse(): Promise<Response | null> {
  return (await isAdmin()) ? null : errorResponse(401, "Sign in as admin first.");
}

export async function startAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, signSession(sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
