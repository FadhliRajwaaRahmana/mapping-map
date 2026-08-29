import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Export all five handlers: better-auth 1.7.2 core only uses GET/POST, but a
// future plugin could add PUT/PATCH/DELETE — this prevents a silent 405.
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
