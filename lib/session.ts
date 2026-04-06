import { cookies } from "next/headers";
import { validateSession } from "./auth";
import { User } from "./types";

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  return validateSession(sessionToken);
}
