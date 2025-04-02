// src/server/api/root.ts
import { createTRPCRouter } from "~/server/api/trpc";
import { tasksRouter } from "~/server/api/routers/tasksRouter";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;