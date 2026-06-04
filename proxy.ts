// proxy.ts
export const runtime = "nodejs"; // MUST be Node.js, not Edge

import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Allowed origins (your Flutter GitHub Pages app)
const ALLOWED_ORIGIN = "https://notoriouszx.github.io";

// Helper to add CORS headers to any response
function addCorsHeaders(response: NextResponse, origin: string | null) {
  const allowOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "*";
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// Handle preflight OPTIONS requests
function handleOptions(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

// The main proxy function
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Handle API preflight (OPTIONS)
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return handleOptions(request);
  }

  // 2. Handle actual API requests (POST, GET, etc.)
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next(); // let the actual route handler run
    const origin = request.headers.get("origin");
    return addCorsHeaders(response, origin);
  }

  // 3. All other routes – use next-intl for internationalisation
  const i18nHandler = createMiddleware(routing);
  return i18nHandler(request);
}

// Match all routes except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
