// File: proxy.ts (Place in your project root)
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// --- Part 1: Configure CORS for API routes ---

const ALLOWED_ORIGINS = [
  "*",
  "http://localhost:52497",
  "https://project-9g6if.vercel.app",
];

function setCorsHeaders(response: NextResponse, origin: string | null) {
  let allowOrigin = "*";
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    allowOrigin = origin;
  }
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  // ✅ ADD x-blob-token to allowed headers
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-blob-token",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

function handleOptionsRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const preflightResponse = new NextResponse(null, { status: 204 });
  return setCorsHeaders(preflightResponse, origin);
}

const handleI18n = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method === "OPTIONS") {
    if (pathname.startsWith("/api/")) {
      return handleOptionsRequest(request);
    }
    return new NextResponse(null, { status: 204 });
  }

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    const origin = request.headers.get("origin");
    return setCorsHeaders(response, origin);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
