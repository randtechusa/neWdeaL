import { pgTable, text, serial, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Core tables
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // asset, liability, equity, income, expense
  parentId: integer("parent_id").references(() => accounts.id),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  explanation: text("explanation"),
  accountId: integer("account_id").references(() => accounts.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  predictedBy: text("predicted_by"), // pattern, database, ai
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pattern matching and prediction tables
export const patterns = pgTable("patterns", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  type: text("type").notNull(), // exact, fuzzy, keyword
  explanation: text("explanation"),
  accountId: integer("account_id").references(() => accounts.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const historicalMatches = pgTable("historical_matches", {
  id: serial("id").primaryKey(),
  transactionDescription: text("transaction_description").notNull(),
  explanation: text("explanation").notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  frequency: integer("frequency").default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
  }),
  children: many(accounts),
  transactions: many(transactions),
  patterns: many(patterns),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
  account: one(accounts, {
    fields: [patterns.accountId],
    references: [accounts.id],
  }),
}));

// Schemas
export const insertAccountSchema = createInsertSchema(accounts);
export const selectAccountSchema = createSelectSchema(accounts);
export const insertTransactionSchema = createInsertSchema(transactions);
export const selectTransactionSchema = createSelectSchema(transactions);
export const insertPatternSchema = createInsertSchema(patterns);
export const selectPatternSchema = createSelectSchema(patterns);

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type InsertPattern = typeof patterns.$inferInsert;
