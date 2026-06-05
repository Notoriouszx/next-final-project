import { jwtVerify } from "jose";
import prisma from "./prisma";

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-min-32-chars-long!!",
);

export async function verifyTokenAndGetUser(authHeader: string | null) {
  console.log("[verify] ===== START =====");
  console.log("[verify] Auth header present?", !!authHeader);
  if (!authHeader) {
    console.log("[verify] No Authorization header");
    return null;
  }
  if (!authHeader.startsWith("Bearer ")) {
    console.log("[verify] Header does not start with Bearer");
    return null;
  }
  const token = authHeader.slice(7);
  console.log(
    "[verify] Token (first 20 chars):",
    token.substring(0, 20) + "...",
  );
  console.log(
    "[verify] Secret (first 10 chars):",
    new TextDecoder().decode(secret.slice(0, 10)) + "...",
  );
  try {
    const { payload } = await jwtVerify(token, secret);
    console.log("[verify] JWT verified, payload:", payload);
    const userId = payload.sub;
    if (!userId) {
      console.log("[verify] No sub claim");
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
    console.log("[verify] User found:", !!user);
    return user;
  } catch (err) {
    console.error("[verify] JWT error details:", err);
    return null;
  }
}
