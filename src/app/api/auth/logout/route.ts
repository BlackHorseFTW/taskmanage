import { lucia } from "~/server/auth/lucia";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("Logout API: Starting logout process");
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(lucia.sessionCookieName);
    
    if (!sessionCookie) {
      console.log("Logout API: No session cookie found");
      return NextResponse.json({ success: true, message: "Already logged out" }, { status: 200 });
    }
    
    console.log("Logout API: Invalidating session");
    await lucia.invalidateSession(sessionCookie.value);
    
    console.log("Logout API: Creating empty session cookie");
    const emptySessionCookie = lucia.createBlankSessionCookie();
    
    // Return response with cookie header instead of setting directly
    return NextResponse.json(
      { success: true, message: "Logged out successfully" }, 
      { 
        status: 200,
        headers: {
          "Set-Cookie": emptySessionCookie.serialize()
        }
      }
    );
  } catch (error) {
    console.error("Logout API: Error during logout", error);
    return NextResponse.json(
      { success: false, message: "Logout failed" }, 
      { status: 500 }
    );
  }
} 