import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, customType } from "drizzle-orm/mysql-core";

// Define LONGTEXT type for large messages
const longtext = customType<{ data: string }>({
  dataType() {
    return "LONGTEXT";
  },
});

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Predictions table to track all spam/ham predictions
 */
export const predictions = mysqlTable("predictions", {
  id: int("id").autoincrement().primaryKey(),
  message: longtext("message").notNull(),
  verdict: mysqlEnum("verdict", ["spam", "ham"]).notNull(),
  confidence: varchar("confidence", { length: 20 }).notNull(),
  keywords: longtext("keywords"),
  messageType: mysqlEnum("messageType", ["sms", "email"]).default("sms"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

/**
 * Analytics table to track overall statistics
 */
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  totalPredictions: int("totalPredictions").default(0).notNull(),
  spamCount: int("spamCount").default(0).notNull(),
  hamCount: int("hamCount").default(0).notNull(),
  truePositives: int("truePositives").default(0).notNull(),
  trueNegatives: int("trueNegatives").default(0).notNull(),
  falsePositives: int("falsePositives").default(0).notNull(),
  falseNegatives: int("falseNegatives").default(0).notNull(),
  accuracy: varchar("accuracy", { length: 20 }).default("0.95").notNull(),
  smsTotal: int("smsTotal").default(0).notNull(),
  emailTotal: int("emailTotal").default(0).notNull(),
  spamPercentage: varchar("spamPercentage", { length: 20 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
