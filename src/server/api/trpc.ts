import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { NextRequest } from "next/server";
import { db } from "../db";
import { validateRequest } from "../auth/lucia";
import type { Session, User } from "lucia";

// Define context shape and extend User type to include role
interface Context {
  db: typeof db;
  headers: Headers;
  user: (User & { role?: "user" | "admin" }) | null;
  session: Session | null;
}

// Define your context
export const createTRPCContext = async (req: NextRequest): Promise<Context> => {
  const authResult = await validateRequest();
  
  return {
    db,
    headers: req.headers,
    user: authResult.user ?? null,
    session: authResult.session ?? null
  };
};

// Initialize tRPC
const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Create a protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session
    }
  });
});

// Admin-only procedure - requires user with admin role
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Check for admin role, safely accessing the role property
  if (!ctx.user.role || ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires admin privileges"
    });
  }
  return next({
    ctx
  });
});