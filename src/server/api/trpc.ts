import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { NextRequest } from "next/server"; // ✅ Correct import for App Router
import { db } from "../db";

// Define your context
export const createTRPCContext = (req: NextRequest) => {
  return {
    db,
    headers: req.headers, // ✅ Adjust for Next.js App Router
  };
};

// Initialize tRPC
const t = initTRPC
  .context<ReturnType<typeof createTRPCContext>>()
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
