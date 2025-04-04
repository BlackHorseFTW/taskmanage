import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { users } from "../../db/schema";
import { db } from "../../db";
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
  // Get all users - admin only
  getUsers: adminProcedure
    .query(async () => {
      try {
        const allUsers = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt
          })
          .from(users)
          .orderBy(users.createdAt);
        
        return {
          users: allUsers
        };
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
          cause: error,
        });
      }
    }),
}); 