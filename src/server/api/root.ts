// src/server/api/root.ts
import { createTRPCRouter } from "~/server/api/trpc";
import { tasksRouter } from "~/server/api/routers/tasksRouter";
import type { inferAsyncReturnType } from "@trpc/server";
import type { createTRPCContext } from "./trpc";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
});

// Export the type definition of the API
export type AppRouter = typeof appRouter;

// Export a caller utility function for server usage
export type Context = inferAsyncReturnType<typeof createTRPCContext>;
export const createCaller = (context: Context) => appRouter.createCaller(context);