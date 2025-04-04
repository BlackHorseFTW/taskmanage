import "server-only";

import superjson from "superjson";
import type { NextRequest } from "next/server";
import { createServerSideHelpers } from "@trpc/react-query/server";

import { appRouter, type AppRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { db } from "~/server/db";

// Create a dummy request object
const dummyReq = {
  headers: new Headers(),
  method: "GET",
  nextUrl: new URL("http://localhost"),
  cookies: {},
} as NextRequest;

// Initialize context with mocked data for server-side helpers
// This is an async function that creates the context
const createContext = async () => {
  return await createTRPCContext(dummyReq);
};

// Create a helper function that initializes everything with the awaited context
export const createServerSideApi = async () => {
  const ctx = await createContext();
  
  return createServerSideHelpers<AppRouter>({
    router: appRouter,
    ctx,
    transformer: superjson,
  });
};

// Export a pre-initialized version for simpler imports
// Note: This should be used only in places where async initialization is acceptable
export const api = createServerSideHelpers<AppRouter>({
  router: appRouter,
  // For synchronous usage, provide a minimal context that will be enhanced at runtime
  ctx: {
    db,
    headers: new Headers(),
    user: null,
    session: null
  },
  transformer: superjson,
});

// Export the type
export type { AppRouter } from "~/server/api/root";
