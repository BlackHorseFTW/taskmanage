import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";
import { tasks, users } from "../../db/schema";
import { eq, and, desc, asc, gte, lte, inArray, or, sql, SQL } from "drizzle-orm";
import { db } from "../../db";
import { randomUUID } from "crypto";
import type { InferSelectModel } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

type Task = InferSelectModel<typeof tasks>;

// Task status and priority enums for validation
const TaskStatus = z.enum(["pending", "in-progress", "completed"]);
type TaskStatusType = z.infer<typeof TaskStatus>;

const TaskPriority = z.enum(["low", "medium", "high"]);
type TaskPriorityType = z.infer<typeof TaskPriority>;

// Date range validation
const DateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Sort options
const SortField = z.enum(["title", "createdAt", "status", "priority"]);
type SortFieldType = z.infer<typeof SortField>;

const SortDirection = z.enum(["asc", "desc"]);
type SortDirectionType = z.infer<typeof SortDirection>;

export const tasksRouter = createTRPCRouter({
  // Create a new task
  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: TaskPriority.default("medium"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
      const newTask = {
        id: randomUUID(),
        title: input.title,
          description: input.description ?? "",
        status: "pending" as const,
          priority: input.priority,
        createdAt: new Date(),
          userId: ctx.user.id,
      };

      await db.insert(tasks).values(newTask);
      return newTask;
      } catch (error) {
        console.error("Error creating task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create task",
          cause: error,
        });
      }
    }),

  // Get tasks with advanced filtering and pagination
  getTasks: protectedProcedure
  .input(
    z.object({
        // Pagination
      limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        
        // Filters
        status: TaskStatus.optional(),
        priority: TaskPriority.optional(),
        priorities: z.array(TaskPriority).optional(),
        search: z.string().optional(),
        dateRange: DateRangeSchema.optional(),
        
        // Sorting
        sortBy: SortField.default("createdAt"),
        sortDirection: SortDirection.default("desc"),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const {
          limit = 10,
          page = 1,
          status,
          priority,
          priorities,
          search,
          dateRange,
          sortBy = "createdAt",
          sortDirection = "desc",
        } = input ?? {};
        
        const offset = (page - 1) * limit;
        
        // Build where conditions based on filters
        const conditions = [eq(tasks.userId, ctx.user.id)];
        
        if (status) {
          conditions.push(eq(tasks.status, status));
        }
        
        if (priority) {
          conditions.push(eq(tasks.priority, priority));
        }
        
        if (priorities && priorities.length > 0) {
          conditions.push(inArray(tasks.priority, priorities));
        }
        
        if (dateRange?.from) {
          conditions.push(gte(tasks.createdAt, dateRange.from));
        }
        
        if (dateRange?.to) {
          conditions.push(lte(tasks.createdAt, dateRange.to));
        }
        
        // Handle search with a direct SQL condition to avoid the or() type issues
        if (search && search.trim() !== '') {
          const searchTerm = `%${search.trim()}%`;
          conditions.push(
            sql`(${tasks.title}::text ILIKE ${searchTerm} OR ${tasks.description}::text ILIKE ${searchTerm})`
          );
        }
        
        // Build sort condition - using type-safe code to prevent errors
        let orderByField;
        if (sortBy === "title") orderByField = tasks.title;
        else if (sortBy === "status") orderByField = tasks.status;
        else if (sortBy === "priority") orderByField = tasks.priority;
        else orderByField = tasks.createdAt;
        
        const orderBy = sortDirection === "asc" 
          ? asc(orderByField)
          : desc(orderByField);
        
        // Execute query with all conditions
        const results = await db
          .select()
          .from(tasks)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset);
        
        // Get total count for pagination
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(and(...conditions));
        
        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.ceil(total / limit);
        
        return {
          tasks: results,
          pagination: {
            total,
            totalPages,
            currentPage: page,
            limit,
            hasMore: page < totalPages,
          },
        };
      } catch (error) {
        console.error("Error getting tasks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tasks",
          cause: error,
        });
      }
    }),

  // Admin endpoint to get all users' tasks
  getAllTasks: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
        userId: z.string().optional(),
        status: TaskStatus.optional(),
        priority: TaskPriority.optional(),
    }).optional()
  )
  .query(async ({ input }) => {
      try {
        const { 
          limit = 20, 
          page = 1, 
          userId, 
          status,
          priority
        } = input ?? {};
        
        const offset = (page - 1) * limit;
        
        // Build conditions
        const conditions: SQL<unknown>[] = [];
        
        if (userId) {
          conditions.push(eq(tasks.userId, userId));
        }

    if (status) {
          conditions.push(eq(tasks.status, status));
        }
        
        if (priority) {
          conditions.push(eq(tasks.priority, priority));
        }
        
        // Query with join to get user info
        const query = db
          .select({
            task: tasks,
            user: {
              id: users.id,
              email: users.email,
              name: users.name,
            },
          })
          .from(tasks)
          .innerJoin(users, eq(tasks.userId, users.id));
        
        // Apply conditions if any
        const filteredQuery = conditions.length > 0
          ? query.where(and(...conditions))
          : query;
        
        const results = await filteredQuery
          .orderBy(desc(tasks.createdAt))
          .limit(limit)
          .offset(offset);
        
        // Get total count
        const baseCountQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(tasks);
        
        const countQuery = conditions.length > 0
          ? baseCountQuery.where(and(...conditions))
          : baseCountQuery;
        
        const countResult = await countQuery;
        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.ceil(total / limit);

    return {
      tasks: results,
      pagination: {
        total,
            totalPages,
            currentPage: page,
        limit,
            hasMore: page < totalPages,
          },
        };
      } catch (error) {
        console.error("Error in admin getAllTasks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch all tasks",
          cause: error,
        });
      }
    }),

  // Update a task - ensure it belongs to the user or user is admin
  updateTask: protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
        status: TaskStatus.optional(),
        priority: TaskPriority.optional(),
    })
  )
    .mutation(async ({ input, ctx }) => {
      try {
    const { id, ...updateData } = input;

        // First check if the task exists
        const taskToUpdate = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, id))
          .then(rows => rows[0]);
        
        if (!taskToUpdate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found"
          });
        }
        
        // Check authorization - allow if user owns task or is admin
        const isOwner = taskToUpdate.userId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin";
        
        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to update this task"
          });
        }

        // Filter out undefined values
        const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(filteredUpdateData).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No update data provided"
          });
    }

        // Update the task
    await db.update(tasks).set(filteredUpdateData).where(eq(tasks.id, id));

        // Get updated task
        const updatedTask = await db
          .select()
      .from(tasks)
      .where(eq(tasks.id, id))
          .then(rows => rows[0]);

    if (!updatedTask) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Updated task not found"
          });
    }

    return updatedTask;
      } catch (error) {
        console.error("Error updating task:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update task",
          cause: error,
        });
      }
    }),

  // Delete a task - ensure it belongs to the user or user is admin
  deleteTask: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: id, ctx }) => {
      try {
        // Check if task exists
        const taskToDelete = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, id))
          .then(rows => rows[0]);
      
      if (!taskToDelete) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found"
          });
        }
        
        // Check authorization - allow if user owns task or is admin
        const isOwner = taskToDelete.userId === ctx.user.id;
        const isAdmin = ctx.user.role === "admin";
        
        if (!isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to delete this task"
          });
        }
        
        // Delete the task
      await db.delete(tasks).where(eq(tasks.id, id));
      
        return { 
          success: true, 
          deletedTask: taskToDelete 
        };
      } catch (error) {
        console.error("Error deleting task:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete task",
          cause: error,
        });
      }
    }),
});