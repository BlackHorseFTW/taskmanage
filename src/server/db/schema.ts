// db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('task_status', ['pending', 'in-progress', 'completed']);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: statusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});