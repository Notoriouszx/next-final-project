/**
 * lib/api-session.ts
 *
 * Session resolver for API route handlers (NextRequest-based).
 * This is SEPARATE from lib/session.ts which is the server-component
 * helper used by the web dashboard — do not modify that file.
 *
 * Why this exists:
 *   The Flutter app is on notoriouszx.github.io and the API is on
 *   project-9g6if.vercel.app. Browsers never send cookies cross-domain,
 *   so the better-auth session cookie never arrives in API routes called
 *   from Flutter. Instead, Flutter reads session.token from the login
 *   response body and sends it as the "x-session-token" header.
 *
 * Strategy:
 *   1. Try auth.api.getSession() with the raw request headers.
 *      → Works for the web dashboard (same domain) and mobile CookieJar.
 *   2. If that returns nothing, read "x-session-token" header and look
 *      up the session row in the database directly.
 *      → Works for Flutter web (cross-domain).
 */

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function getApiSession(request: Request) {
  // ── 1. Cookie-based (web dashboard + mobile) ──────────────────────
  const cookieSession = await auth.api.getSession({ headers: request.headers });
  if (cookieSession?.user) return cookieSession;

  // ── 2. Header-based (Flutter web cross-domain) ────────────────────
  const token = request.headers.get("x-session-token");
  if (!token) return null;

  const sessionRow = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!sessionRow) return null;
  if (new Date() > sessionRow.expiresAt) return null;

  // Return same shape as auth.api.getSession()
  return { user: sessionRow.user, session: sessionRow };
}
