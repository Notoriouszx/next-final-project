import { supabase } from "./supabase/client";
import { supabaseAdmin } from "./supabase/server";
import bcrypt from "bcryptjs";
import { User, UserRole } from "./types";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = "patient"
): Promise<User | null> {
  try {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error("Error in createUser:", error);
    return null;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return null;
    }

    if (!user.password_hash) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return user as User;
  } catch (error) {
    console.error("Error in authenticateUser:", error);
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabaseAdmin.from("sessions").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export async function validateSession(token: string): Promise<User | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (error || !session) {
      return null;
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabaseAdmin.from("sessions").delete().eq("token", token);
      return null;
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single();

    return user as User;
  } catch (error) {
    console.error("Error in validateSession:", error);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  await supabaseAdmin.from("sessions").delete().eq("token", token);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateMagicToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
