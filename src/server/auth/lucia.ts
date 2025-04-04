import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Session, User } from "lucia";

// Initialize Lucia with Drizzle adapter
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

// Type-safe attribute interface
interface DatabaseUserAttributes {
  email: string;
  name: string | null;
  role: "user" | "admin";
}

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production"
    }
  },
  getUserAttributes: (attributes): DatabaseUserAttributes => {
    // Cast attributes to record to avoid type errors
    const attrs = attributes as Record<string, unknown>;
    return {
      email: attrs.email as string,
      name: attrs.name as string | null,
      role: attrs.role as "user" | "admin"
    };
  }
});

export const validateRequest = cache(
  async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
    try {
      console.log("validateRequest: Starting validation");
      
      // Get session cookie - properly await cookies()
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(lucia.sessionCookieName);
      console.log("validateRequest: Session cookie found?", !!sessionCookie);
      
      if (!sessionCookie) {
        console.log("validateRequest: No session cookie found");
        return { user: null, session: null };
      }

      // Validate the session
      console.log("validateRequest: Validating session with cookie value");
      try {
        const result = await lucia.validateSession(sessionCookie.value);
        console.log("validateRequest: Session validation result", { 
          hasUser: !!result.user, 
          hasSession: !!result.session,
          isFresh: result.session?.fresh
        });
        
        // Handle session freshness - update cookie if needed
        if (result.session?.fresh) {
          try {
            const newCookie = lucia.createSessionCookie(result.session.id);
            // Safely set cookie
            cookieStore.set(newCookie.name, newCookie.value, newCookie.attributes);
          } catch (err) {
            console.error("Failed to create fresh session cookie:", err);
          }
        }
        
        return result;
      } catch (validationError) {
        console.error("validateRequest: Error validating session", validationError);
        // Clear invalid cookie
        try {
          const blankCookie = lucia.createBlankSessionCookie();
          cookieStore.set(blankCookie.name, blankCookie.value, blankCookie.attributes);
        } catch (err) {
          console.error("Failed to create blank cookie:", err);
        }
        return { user: null, session: null };
      }
    } catch (error) {
      console.error("validateRequest: Unexpected error", error);
      return { user: null, session: null };
    }
  }
);

// This is needed for Lucia
declare global {
  // Allow duplicate declaration for Lucia
  namespace Lucia {
    type Auth = typeof lucia;
    type DatabaseUserAttributes = {
      email: string;
      name: string | null;
      role: "user" | "admin";
    };
    type DatabaseSessionAttributes = Record<string, never>;
  }
} 