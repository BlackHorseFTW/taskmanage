import { NextResponse } from "next/server";
import { lucia } from "~/server/auth/lucia";

export async function GET() {
  console.log("Clearing auth cookies");
  
  try {
    // Use Lucia's blank session cookie
    const blankCookie = lucia.createBlankSessionCookie();
    
    // Clear all cookies that might be related to auth
    // We'll use client-side JS to make sure all cookies are cleared properly too
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Authentication cookies cleared",
        cookieCleared: lucia.sessionCookieName
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": blankCookie.serialize(),
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
    
    console.log("Successfully created clear cookie response");
    return response;
  } catch (error) {
    console.error("Error clearing cookies:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear cookies" },
      { status: 500 }
    );
  }
} 