import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { tasks } from "../../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto"; // Node.js bu
import { InferSelectModel } from "drizzle-orm";

type Task = InferSelectModel<typeof tasks>; // ✅ Infers the correct type

export const tasksRouter = createTRPCRouter({
  // Create a new task
  createTask: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const newTask = {
        id: randomUUID(),
        title: input.title,
        description: input.description || "",
        status: "pending" as const,
        createdAt: new Date(),
      };

      await db.insert(tasks).values(newTask);
      return newTask;
    }),

  // Get all tasks with optional pagination and filtering
  getTasks: publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
      status: z.enum(["pending", "in-progress", "completed"]).optional(),
    }).optional()
  )
  .query(async ({ input }) => {
    const { limit = 10, offset = 0, status } = input || {};

    let query = db.select().from(tasks); // ✅ Remove explicit field selection (optional)

    if (status) {
      query = query.where(eq(tasks.status, status));
    }

    const results: Task[] = await query.limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(tasks);
    const total = countResult[0]?.count || 0;

    return {
      tasks: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
    };
  }),
  // Update a task
  updateTask: publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(["pending", "in-progress", "completed"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { id, ...updateData } = input;

    const filteredUpdateData: Partial<{
      title: string;
      description: string;
      status: "pending" | "in-progress" | "completed";
    }> = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(filteredUpdateData).length === 0) {
      throw new Error("No update data provided");
    }

    await db.update(tasks).set(filteredUpdateData).where(eq(tasks.id, id));

    const updatedTask = (await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .then((rows) => rows[0])) as {
      id: string;
      title: string;
      description: string;
      status: "pending" | "in-progress" | "completed";
      createdAt: Date;
    }; // ✅ Explicitly defining return type

    if (!updatedTask) {
      throw new Error("Task not found");
    }

    return updatedTask;
  }),

  // Delete a task
  deleteTask: publicProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: id }) => {
      const taskToDelete = await db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        createdAt: tasks.createdAt,
      }).from(tasks).where(eq(tasks.id, id)).then(rows => rows[0]);
      
      if (!taskToDelete) {
        throw new Error("Task not found");
      }
      
      await db.delete(tasks).where(eq(tasks.id, id));
      
      return { success: true, deletedTask: taskToDelete };
    }),
});
