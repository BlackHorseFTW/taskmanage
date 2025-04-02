import "server-only";

import superjson from "superjson";
import type { NextRequest } from "next/server";
import { createServerSideHelpers } from "@trpc/react-query/server";

import { appRouter, type AppRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

// Server-side TRPC helpers
export const api = createServerSideHelpers<AppRouter>({
  router: appRouter,
  ctx: createTRPCContext({
    headers: new Headers(),
    method: "GET",
    nextUrl: new URL("http://localhost"),
    cookies: {},
  } as NextRequest),
  transformer: superjson,
});

// Export the type
export type { AppRouter } from "~/server/api/root";
