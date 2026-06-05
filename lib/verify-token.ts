import { jwtVerify } from "jose";
import prisma from "./prisma";

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-min-32-chars-long!!",
);

export async function verifyTokenAndGetUser(authHeader: string | null) {
  console.log("[verify] authHeader present:", !!authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("[verify] No Bearer token");
    return null;
  }
  const token = authHeader.slice(7);
  console.log("[verify] token (first 20 chars):", token.substring(0, 20));
  try {
    const { payload } = await jwtVerify(token, secret);
    console.log("[verify] decoded payload:", payload);
    const userId = payload.sub as string;
    if (!userId) {
      console.log("[verify] No sub claim");
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
    console.log("[verify] user found:", !!user);
    return user;
  } catch (err) {
    console.error("[verify] JWT verification error:", err);
    return null;
  }
}
