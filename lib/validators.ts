import { z } from "zod";

export const createMapSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
});

export const renameMapSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  isArchived: z.boolean().optional(),
});

export const saveStateSchema = z.object({
  scene: z
    .object({
      type: z.literal("excalidraw"),
      version: z.number(),
      elements: z.array(z.unknown()),
      appState: z.record(z.string(), z.unknown()).optional(),
      files: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  baseRevision: z.number().int().min(0),
});

export const createNodeSchema = z.object({
  elementId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300).default("Tanpa judul"),
});

export const updateNodeSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  contentMd: z.string().max(200_000).optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export const roleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export const createNodeFullSchema = z.object({
  id: z.string().uuid(),
  elementId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300).default("Tanpa judul"),
});

export const visibilitySchema = z.object({
  visibility: z.enum(["private", "public"]),
  publicRole: z.enum(["viewer", "editor"]).optional(),
});

export const banSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().trim().max(500).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export const updateRoleSchema = z.object({
  role: z.enum(["user", "superadmin"]),
});

export const MAX_BODY_BYTES = 4 * 1024 * 1024;
