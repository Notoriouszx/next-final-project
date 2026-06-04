// File: proxy.ts (at the root of your project)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The function name is now 'proxy', not 'middleware'
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  const response = NextResponse.next();
  // Add CORS headers to the response
  response.headers.set("Access-Control-Allow-Origin", origin);
  // ... (other headers)
  return response;
}

// The 'config' object for matching routes remains the same
export const config = {
  matcher: "/api/:path*",
};
