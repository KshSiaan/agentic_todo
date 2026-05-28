import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

/**
 * Todos table schema with comprehensive fields and constraints
 * Optimized for production use with proper indexing and timestamps
 */
export const todosTable = pgTable(
  "todos",
  {
    // Identity
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    // Content
    title: varchar({ length: 255 }).notNull(),
    description: text(),

    // Status & Priority
    status: varchar({ length: 50 }).default("pending").notNull(),
    priority: varchar({ length: 50 }).default("medium").notNull(),
    isCompleted: boolean().default(false).notNull(),

    // Timestamps
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
    dueDate: timestamp({ withTimezone: true }),
  },
  (table) => ({
    // Indexes for common queries
    statusIdx: index("todos_status_idx").on(table.status),
    completedIdx: index("todos_completed_idx").on(table.isCompleted),
    createdAtIdx: index("todos_created_at_idx").on(table.createdAt),
    dueDateIdx: index("todos_due_date_idx").on(table.dueDate),
  }),
);
