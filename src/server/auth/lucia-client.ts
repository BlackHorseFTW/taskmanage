import type { Session, User } from "lucia";

// Client-safe version of validateRequest without server-only imports
export async function validateClientRequest(): Promise<{ 
  user: (User & { role?: "user" | "admin" }) | null; 
  session: Session | null;
}> {
  try {
    console.log("Client validateRequest: Starting validation");
    
    // Make a fetch request to an API endpoint that handles auth validation
    const response = await fetch("/api/auth/validate", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include" // Important for sending cookies with the request
    });
    
    if (!response.ok) {
      console.log("Client validateRequest: API response not OK", response.status);
      return { user: null, session: null };
    }
    
    // Define proper interface for response data
    interface AuthResponse {
      user: (User & { role?: "user" | "admin" }) | null;
      session: Session | null;
    }

    const data = await response.json() as AuthResponse;
    console.log("Client validateRequest: Received data from API", { hasUser: !!data.user });
    
    return {
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error("Client validateRequest: Error during validation", error);
    return { user: null, session: null };
  }
} 