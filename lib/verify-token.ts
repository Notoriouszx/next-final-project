import { jwtVerify } from "jose";
import prisma from "./prisma";

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-min-32-chars-long!!",
);

export async function verifyTokenAndGetUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
    return user;
  } catch {
    return null;
  }
}
