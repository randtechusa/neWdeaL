import { pgTable, text, serial, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Users and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Core tables
export const masterAccounts = pgTable("master_accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // asset, liability, equity, income, expense
  parentId: integer("parent_id").references(() => masterAccounts.id),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAccounts = pgTable("user_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  masterAccountId: integer("master_account_id").references(() => masterAccounts.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // asset, liability, equity, income, expense
  parentId: integer("parent_id").references(() => userAccounts.id),
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
  accountId: integer("account_id").references(() => userAccounts.id),
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
  accountId: integer("account_id").references(() => userAccounts.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const historicalMatches = pgTable("historical_matches", {
  id: serial("id").primaryKey(),
  transactionDescription: text("transaction_description").notNull(),
  explanation: text("explanation").notNull(),
  accountId: integer("account_id").references(() => userAccounts.id).notNull(),
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
export const masterAccountsRelations = relations(masterAccounts, ({ one, many }) => ({
  parent: one(masterAccounts, {
    fields: [masterAccounts.parentId],
    references: [masterAccounts.id],
  }),
  children: many(masterAccounts),
  userAccounts: many(userAccounts),
}));

export const userAccountsRelations = relations(userAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [userAccounts.userId],
    references: [users.id],
  }),
  masterAccount: one(masterAccounts, {
    fields: [userAccounts.masterAccountId],
    references: [masterAccounts.id],
  }),
  parent: one(userAccounts, {
    fields: [userAccounts.parentId],
    references: [userAccounts.id],
  }),
  children: many(userAccounts),
  transactions: many(transactions),
  patterns: many(patterns),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(userAccounts, {
    fields: [transactions.accountId],
    references: [userAccounts.id],
  }),
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
  account: one(userAccounts, {
    fields: [patterns.accountId],
    references: [userAccounts.id],
  }),
}));

// Schemas
// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MasterAccount = typeof masterAccounts.$inferSelect;
export type InsertMasterAccount = typeof masterAccounts.$inferInsert;
export type UserAccount = typeof userAccounts.$inferSelect;
export type InsertUserAccount = typeof userAccounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type InsertPattern = typeof patterns.$inferInsert;

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertMasterAccountSchema = createInsertSchema(masterAccounts);
export const selectMasterAccountSchema = createSelectSchema(masterAccounts);
export const insertUserAccountSchema = createInsertSchema(userAccounts);
export const selectUserAccountSchema = createSelectSchema(userAccounts);
export const insertTransactionSchema = createInsertSchema(transactions);
export const selectTransactionSchema = createSelectSchema(transactions);
export const insertPatternSchema = createInsertSchema(patterns);
export const selectPatternSchema = createSelectSchema(patterns);
