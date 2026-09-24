import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["user", "editor", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const liveStreams = mysqlTable("liveStreams", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  streamerName: varchar("streamerName", { length: 120 }).notNull(),
  platform: mysqlEnum("platform", ["youtube", "twitch", "kick"]).notNull(),
  streamUrl: text("streamUrl").notNull(),
  embedUrl: text("embedUrl"),
  layoutGroup: varchar("layoutGroup", { length: 48 }),
  isActive: boolean("isActive").default(true).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  coverUrl: text("coverUrl"),
  criticScore: decimal("criticScore", { precision: 4, scale: 1 }),
  preferredPlatform: mysqlEnum("preferredPlatform", ["xbox", "playstation", "nintendo", "pc", "multi"]).default("multi").notNull(),
  releaseYear: int("releaseYear"),
  description: text("description"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  author: varchar("author", { length: 180 }).notNull(),
  coverUrl: text("coverUrl"),
  isbn: varchar("isbn", { length: 32 }),
  criticScore: decimal("criticScore", { precision: 4, scale: 1 }),
  description: text("description"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  itemType: mysqlEnum("itemType", ["game", "book"]).notNull(),
  itemId: int("itemId").notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull(),
  personName: varchar("personName", { length: 120 }).notNull(),
  timeSpent: int("timeSpent").notNull(),
  progress: int("progress").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  itemType: mysqlEnum("itemType", ["game", "book"]).notNull(),
  itemId: int("itemId").notNull(),
  authorName: varchar("authorName", { length: 120 }).notNull(),
  body: text("body").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const epubs = mysqlTable("epubs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  author: varchar("author", { length: 180 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  fileUrl: text("fileUrl").notNull(),
  storageKey: text("storageKey"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const externalLinks = mysqlTable("externalLinks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: varchar("category", { length: 72 }).default("Geral").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 48 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
