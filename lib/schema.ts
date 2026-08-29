import { sqliteTable, text, integer, blob, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
export * from "./auth-schema";

export const maps = sqliteTable("maps", {
  id: text("id").primaryKey(),
  ownerId: text("ownerId").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
  visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  publicRole: text("publicRole", { enum: ["viewer", "editor"] }).notNull().default("viewer"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const mapCollaborators = sqliteTable(
  "map_collaborators",
  {
    mapId: text("mapId").notNull().references(() => maps.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.mapId, t.userId] })],
);

export const mapState = sqliteTable("map_state", {
  mapId: text("mapId").primaryKey().references(() => maps.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  scene: text("scene").notNull(),
  updatedBy: text("updatedBy"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const mapNodes = sqliteTable(
  "map_nodes",
  {
    id: text("id").primaryKey(),
    mapId: text("mapId").notNull().references(() => maps.id, { onDelete: "cascade" }),
    elementId: text("elementId").notNull(),
    title: text("title").notNull(),
    contentMd: text("contentMd").notNull().default(""),
    updatedBy: text("updatedBy"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("map_nodes_map_element_uidx").on(t.mapId, t.elementId)],
);

export const mapFiles = sqliteTable(
  "map_files",
  {
    id: text("id").primaryKey(),
    mapId: text("mapId").notNull().references(() => maps.id, { onDelete: "cascade" }),
    fileId: text("fileId").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    data: blob("data", { mode: "buffer" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("map_files_map_file_uidx").on(t.mapId, t.fileId)],
);

export const mapLibrary = sqliteTable("map_library", {
  mapId: text("mapId").primaryKey().references(() => maps.id, { onDelete: "cascade" }),
  dataJson: text("dataJson").notNull(),
  updatedBy: text("updatedBy"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const presence = sqliteTable(
  "presence",
  {
    mapId: text("mapId").notNull().references(() => maps.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    lastSeen: integer("lastSeen", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.mapId, t.userId] })],
);
