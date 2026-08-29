import { describe, it, expect } from "vitest";
import { createMapSchema, updateNodeSchema, inviteSchema } from "@/lib/validators";

describe("validators", () => {
  it("accepts a valid map creation", () => {
    const r = createMapSchema.safeParse({ title: "Riset", description: "" });
    expect(r.success).toBe(true);
  });
  it("rejects an empty title", () => {
    const r = createMapSchema.safeParse({ title: "   " });
    expect(r.success).toBe(false);
  });
  it("accepts a markdown content update", () => {
    const r = updateNodeSchema.safeParse({ contentMd: "# Heading\n- a" });
    expect(r.success).toBe(true);
  });
  it("rejects an invalid invite email", () => {
    const r = inviteSchema.safeParse({ email: "nope", role: "editor" });
    expect(r.success).toBe(false);
  });
  it("defaults invite role to editor", () => {
    const r = inviteSchema.safeParse({ email: "a@b.com" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("editor");
  });
});
