import { pgTable, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const taskPriority = pgEnum("task_priority", ['low', 'medium', 'high'])
export const taskStatus = pgEnum("task_status", ['pending', 'in-progress', 'completed'])
export const userRole = pgEnum("user_role", ['user', 'admin'])



