import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Argon2id } from "oslo/password";

// Define schema for login input
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  selectedRole: z.enum(["user", "admin"]).optional(),
});

export async function POST(request: Request) {
  console.log("Login API: Starting login process");
  
  try {
    // Parse request body
    const body = await request.json() as z.infer<typeof loginSchema>;
    console.log("Login API: Validating input");
    
    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      console.log("Login API: Invalid input", result.error.flatten());
      return NextResponse.json({ 
        error: "Invalid input", 
        details: result.error.flatten() 
      }, { status: 400 });
    }
    
    const { email, password, selectedRole = "user" } = result.data;
    console.log(`Login API: Attempting login for ${email} as ${selectedRole}`);
    
    // Find user by email
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    
    const existingUser = userRecords[0]; // Get the first user from the array
    
    if (!existingUser) {
      console.log("Login API: User not found");
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }
    
    console.log("Login API: User found, verifying password");
    
    // Special case for manually added admin user
    // If the user is trying to login as admin and the role matches, allow login without password verification
    if (selectedRole === "admin" && existingUser.role === "admin") {
      // Check if password hash might be invalid
      if (!existingUser.hashedPassword || existingUser.hashedPassword.length < 20) {
        console.log("Login API: Admin login with potentially invalid hash, checking direct password");
        // For manually added admin, check direct password instead
        if (password === "admin123") { // Replace with your admin password if different
          console.log("Login API: Admin password direct match, allowing login");
          // Skip normal password verification
          
          // Create new session
          const session = await lucia.createSession(existingUser.id, {});
          const sessionCookie = lucia.createSessionCookie(session.id);
          
          console.log("Login API: Session created for admin, ID:", session.id);
          return NextResponse.json(
            { 
              success: true, 
              role: existingUser.role,
              redirectTo: "/admin"
            },
            { 
              status: 200,
              headers: {
                "Set-Cookie": sessionCookie.serialize()
              }
            }
          );
        }
      }
    }
    
    // Normal password verification path
    try {
      // Verify password using Argon2id
      const passwordVerifier = new Argon2id();
      const validPassword = await passwordVerifier.verify(
        existingUser.hashedPassword,
        password
      );
      
      if (!validPassword) {
        console.log("Login API: Invalid password");
        return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
      }
    } catch (verifyError) {
      console.error("Login API: Password verification error", verifyError);
      
      // If this is the admin user and password verification failed due to hash format issues
      if (selectedRole === "admin" && existingUser.role === "admin") {
        if (password === "admin123") { // Replace with your admin password if different
          console.log("Login API: Admin password direct match after verify error");
          // Skip normal password verification
        } else {
          return NextResponse.json({ error: "Invalid password" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
      }
    }
    
    // Check role if trying to login as admin
    if (selectedRole === "admin" && existingUser.role !== "admin") {
      console.log("Login API: User attempting to login as admin but doesn't have admin role");
      return NextResponse.json({ error: "You don't have admin privileges" }, { status: 403 });
    }
    
    console.log("Login API: Password valid, creating session");
    // Create new session
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    
    console.log("Login API: Session created, ID:", session.id);
    
    // Create serialized cookie for header
    const serializedCookie = sessionCookie.serialize();
    
    // Avoid logging full cookie contents for security
    console.log("Login API: Created session cookie (value hidden)");
    
    // Return response with Set-Cookie header
    return NextResponse.json(
      { 
        success: true, 
        role: existingUser.role,
        redirectTo: existingUser.role === "admin" ? "/admin" : "/"
      },
      { 
        status: 200,
        headers: {
          "Set-Cookie": serializedCookie
        }
      }
    );
  } catch (error) {
    console.error("Login API: Error during login", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 