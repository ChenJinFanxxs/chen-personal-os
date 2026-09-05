import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workspace = sqliteTable("workspace", {
  id: integer("id").primaryKey(), recoveryHash: text("recovery_hash").notNull(), createdAt: integer("created_at").notNull(),
});
export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(), tokenHash: text("token_hash").notNull().unique(), name: text("name").notNull(), createdAt: integer("created_at").notNull(),
});
export const pairings = sqliteTable("pairings", {
  hash: text("hash").primaryKey(), deviceId: text("device_id").notNull(), expiresAt: integer("expires_at").notNull(),
});
export const records = sqliteTable("records", {
  id: text("id").primaryKey(), value: text("value").notNull(), revision: integer("revision").notNull(), deleted: integer("deleted").notNull().default(0), updatedAt: integer("updated_at").notNull(),
});
export const operations = sqliteTable("operations", {
  id: text("id").primaryKey(), fingerprint: text("fingerprint").notNull(), result: text("result").notNull(), createdAt: integer("created_at").notNull(),
});
export const files = sqliteTable("files", {
  id: text("id").primaryKey(), name: text("name").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(), createdAt: integer("created_at").notNull(),
});
export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(), count: integer("count").notNull(),
});
