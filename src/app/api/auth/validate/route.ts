import { validateRequest } from "~/server/auth/lucia";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Validate API: Starting validation");
    const { user, session } = await validateRequest();
    
    // Only return safe user data (don't expose sensitive information)
    const safeUser = user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    } : null;
    
    // Only return safe session data
    const safeSession = session ? {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt
    } : null;
    
    console.log("Validate API: Returning response", { 
      authenticated: !!safeUser,
      role: safeUser?.role
    });
    
    return NextResponse.json({ 
      user: safeUser,
      session: safeSession
    });
  } catch (error) {
    console.error("Validate API error:", error);
    return NextResponse.json(
      { user: null, session: null, error: "Authentication failed" },
      { status: 401 }
    );
  }
} 