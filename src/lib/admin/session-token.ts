import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/*
 * Admin sessions are a signed expiry time in a cookie: "<expires ms>.<HMAC>".
 * There is a single admin, so there is no user id to carry.
 */

export const ADMIN_COOKIE = "cinemadle_admin";
export const SESSION_DAYS = 30;

const mac = (secret: string, expires: number) =>
  createHmac("sha256", secret).update(`admin:${expires}`).digest("base64url");

export function signSession(secret: string, now: number = Date.now()): string {
  const expires = now + SESSION_DAYS * 86_400_000;
  return `${expires}.${mac(secret, expires)}`;
}

export function verifySession(token: string | undefined, secret: string, now: number = Date.now()): boolean {
  if (!token) return false;
  const [expiresText, signature] = token.split(".");
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= now || !signature) return false;
  const expected = Buffer.from(mac(secret, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Constant-time password check; an unset password never matches. */
export function passwordMatches(input: string, password: string | undefined): boolean {
  if (!password) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(input), digest(password));
}
