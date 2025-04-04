import { lucia } from "~/server/auth/lucia";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Argon2id } from "oslo/password";
import crypto from "crypto";

// Input validation
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  // Optional role - if not provided, defaults to 'user'
  role: z.enum(["user", "admin"]).optional()
});

export async function POST(request: Request) {
  try {
    console.log("Signup API: Starting signup process");
    const body = await request.json() as z.infer<typeof signupSchema>;
    const result = signupSchema.safeParse(body);
    
    if (!result.success) {
      console.log("Signup API: Invalid input", result.error.flatten());
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email, password, name, role = "user" } = result.data;
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Signup API: Attempting signup for ${normalizedEmail}`);
    
    // Check if user exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("Signup API: User already exists");
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    
    // Hash password
    console.log("Signup API: Hashing password");
    const hashedPassword = await new Argon2id().hash(password);
    
    // Generate user ID
    const userId = crypto.randomUUID();
    console.log("Signup API: Generated user ID", userId);
    
    // Create user
    console.log("Signup API: Creating user");
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      hashedPassword,
      name: name ?? null,
      role, // Add role field
      createdAt: new Date()
    });
    
    // Create session
    console.log("Signup API: Creating session");
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    
    // Create serialized cookie for header
    const serializedCookie = sessionCookie.serialize();
    
    // Avoid logging full cookie contents for security
    console.log("Signup API: Created session cookie (value hidden)");
    
    // Return response with Set-Cookie header
    return NextResponse.json(
      { success: true, message: "Account created successfully" },
      { 
        status: 200,
        headers: {
          "Set-Cookie": serializedCookie
        }
      }
    );
  } catch (error) {
    console.error("Signup API: Error during signup", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 