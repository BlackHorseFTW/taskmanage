// Compatibility layer for authentication
import { cookies } from "next/headers";

/**
 * Check if a user is logged in based on cookie presence
 * Safe to use in both server components and middleware
 */
export async function isUserLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has("auth_session");
}

/**
 * Get the auth session cookie value
 * Safe to use in both server components and middleware
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_session")?.value;
} 