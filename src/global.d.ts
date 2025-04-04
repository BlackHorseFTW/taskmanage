import { User } from "lucia";

// Extend User type to include role property
declare module "lucia" {
  interface User {
    role?: "user" | "admin";
    email?: string;
    name?: string | null;
  }
}

// Fix any ReadonlyRequestCookies issues
declare module "next/headers" {
  interface ReadonlyRequestCookies {
    get(name: string): { name: string; value: string } | undefined;
    getAll(): Array<{ name: string; value: string }>;
  }
} 