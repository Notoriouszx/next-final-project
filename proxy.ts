// File: proxy.ts (Place in your project root)
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// --- Part 1: Configure CORS for API routes ---

// Define allowed origins for your API. Replace with your actual app's URL in production.
// Using '*' is fine for development on localhost.
const ALLOWED_ORIGINS = [
  "*",
  "http://localhost:52497",
  "https://project-9g6if.vercel.app",
];

// Helper function to set CORS headers on a response
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
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// Helper to handle an OPTIONS (preflight) request directly
function handleOptionsRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const preflightResponse = new NextResponse(null, { status: 204 });
  return setCorsHeaders(preflightResponse, origin);
}

// --- Part 2: The main request handler ---

// Create the next-intl handler for internationalized routes
const handleI18n = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Handle API Preflight (OPTIONS) Requests
  if (request.method === "OPTIONS") {
    if (pathname.startsWith("/api/")) {
      return handleOptionsRequest(request);
    }
    return new NextResponse(null, { status: 204 });
  }

  // 2. Handle API Requests (POST, GET, PUT, etc.)
  if (pathname.startsWith("/api/")) {
    // Let the request pass through to your existing API routes...
    const response = NextResponse.next();
    // ...but add the required CORS headers to the response
    const origin = request.headers.get("origin");
    return setCorsHeaders(response, origin);
  }

  // 3. Handle all other requests (Your Website Pages) with next-intl
  // This ensures your i18n routing works correctly for all locales and pages.
  return handleI18n(request);
}

// --- Part 3: Configure the proxy to run on every route except static assets ---
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
