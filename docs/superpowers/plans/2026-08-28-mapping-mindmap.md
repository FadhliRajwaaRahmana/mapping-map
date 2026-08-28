# Mapping Mind-Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative Excalidraw-style mind-map web app: register/login, a dashboard of maps, and an editor where an infinite canvas holds clickable nodes that open a Markdown detail panel; co-editors see each other's changes within 2–3s (polling).

**Architecture:** Single Vercel deployment (Next.js 16 App Router + React 19 + TypeScript). All data lives in Turso (libSQL) as the single source of truth. Real-time collaboration is done by debounced save + polling (no WebSockets) — the server merges concurrent saves with Excalidraw's `reconcileElements` (per-element last-write-wins). Auth is better-auth (email+password, DB sessions).

**Tech Stack (pinned):** next 16.3.3, react 19.2.8, @excalidraw/excalidraw 0.18.1, better-auth 1.7.2 + @better-auth/drizzle-adapter 1.7.2, drizzle-orm 0.45.2 + drizzle-kit 0.31.10, @libsql/client 0.17.4, Tailwind v4 + shadcn/ui, react-markdown 10.1.0 + remark-gfm 4.0.1, @uiw/react-codemirror 4.25.11, zod, framer-motion, vitest 4, @playwright/test 1.62.

**Verified source notes (2026-08-28):** Every command, API signature, and package version in this plan was verified against live npm, the published Excalidraw 0.18.1 `.d.ts`, better-auth 1.7.2 dist, and actual CLI `--help` runs. Where a common assumption is WRONG for the pinned version, the plan states the correction explicitly (see the "Corrections" callouts).

---

## Conventions (apply to EVERY task)

- TypeScript strict. No `any` except where interfacing unknown Excalidraw JSON.
- UI text: **Bahasa Indonesia**. Code/identifiers: English.
- Every API route handler is typed `request: Request` (NOT `NextRequest`) — verified required for both vitest and `next build` type-check.
- Dynamic routes await `params` (Next 15/16): `const { id } = await params;`.
- DB-using routes export `export const runtime = "nodejs";` (libsql client is Node-only).
- JSON responses: success = `2xx { data }`; error = status + `{ error: <code>, message }`. Error codes: `unauthorized`(401) `forbidden`(403) `not_found`(404) `validation`(400) `conflict`(409) `too_large`(413) `internal`(500).
- IDs via `newId()` (uuid), timestamps `Date.now()` (ms).
- Conventional commits, one per task (or per logical step group).
- `.env` never committed; only `.env.example`.

### File structure (what the finished app looks like)

```
app/
  layout.tsx                     # root layout (fonts, Toaster)
  page.tsx                       # LANDING (public)
  globals.css
  (auth)/layout.tsx
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (auth)/reset-password/page.tsx
  maps/page.tsx                  # DASHBOARD
  maps/[id]/page.tsx             # EDITOR (server: guard + fetch, renders <EditorClient/>)
  api/auth/[...all]/route.ts
  api/maps/route.ts                          # GET list, POST create
  api/maps/[id]/route.ts                     # GET one, PATCH rename, DELETE
  api/maps/[id]/state/route.ts               # GET poll (ETag), POST save+merge
  api/maps/[id]/nodes/route.ts               # GET all, POST create
  api/maps/[id]/nodes/[nodeId]/route.ts      # GET, PATCH, DELETE
  api/maps/[id]/files/route.ts               # GET list, POST upload
  api/maps/[id]/files/[fileId]/route.ts      # GET blob, DELETE
  api/maps/[id]/collaborators/route.ts       # GET, POST invite
  api/maps/[id]/collaborators/[userId]/route.ts  # DELETE
  api/maps/[id]/presence/route.ts            # POST heartbeat, GET
components/
  ui/*                             # shadcn generated
  providers.tsx
  landing/{hero,features,demo-canvas,landing-footer}.tsx
  auth/auth-form.tsx
  maps/{map-card,new-map-dialog,share-dialog}.tsx
  editor/{editor-client,canvas-bridge,node-panel,topbar,presence-avatars,toolbar-node}.tsx
  markdown/{markdown-editor,markdown-view}.tsx
lib/
  auth-schema.ts                  # verbatim `npx auth generate` output (user/session/account/verification)
  schema.ts                       # app tables + re-exports auth tables
  db.ts                           # libsql client singleton + drizzle
  auth.ts                         # betterAuth instance
  env.ts
  validators.ts
  guards.ts
  scene.ts
  files.ts
  utils.ts                        # cn() (shadcn) + newId()
  api-client.ts                   # client-side fetch wrapper
  hooks/use-debounced-callback.ts
drizzle.config.ts
vitest.config.mts
vitest.setup.ts
playwright.config.ts
tests/unit/{scene,guards,validators}.test.ts
tests/integration/api.test.ts
e2e/flow.spec.ts
.env.example
```

### Task overview

| # | Task | Phase |
|---|------|-------|
| 1 | Scaffold Next.js + shadcn + config | Setup |
| 2 | Data layer: Drizzle + schema + migration | Setup |
| 3 | better-auth server (config + route + guard) | Setup |
| 4 | Auth pages (register/login/reset) | Auth UI |
| 5 | Landing page | Landing |
| 6 | Maps API (list/create) + requireMapRole | Maps |
| 7 | Dashboard UI | Maps |
| 8 | Scene merge logic + unit tests | Editor core |
| 9 | Editor page + CanvasBridge (Excalidraw) | Editor core |
| 10 | Node creation (+ button, key `N`) | Editor core |
| 11 | Nodes API + Markdown node panel | Editor core |
| 12 | State save + poll (ETag, debounce, merge, image guard) | Editor core |
| 13 | Collaborators API + Share dialog | Collab |
| 14 | Presence API + avatars | Collab |
| 15 | Export PNG/JSON (+ image size guard) | Editor core |
| 16 | Integration API tests (full) | Testing |
| 17 | E2E (Playwright) | Testing |
| 18 | Deploy (Vercel + Turso + CI migration) | Deploy |

> **v1 image scope (important):** Images are stored **inline as dataURLs inside the scene JSON** (Excalidraw-native). A per-image cap (2 MB) is enforced on paste, and a whole-scene cap (4 MB serialized) blocks saves that would exceed Vercel's 4.5 MB body limit. The `map_files` BLOB table is created in the schema now but is **unused in v1** — it is the phase-2 upgrade path for BLOB-backed images (fetch-on-load, strip dataURL on save) that lifts the 4 MB scene cap. Do not build the BLOB fetch/upload flow in v1.

---

## PHASE 0 — SETUP

### Task 1: Scaffold Next.js + shadcn + base config

**Files:**
- Create: `drizzle.config.ts`, `vitest.config.mts`, `.env.example`
- Modify: `package.json` (scripts + deps), `tsconfig.json` (exclude), `app/globals.css` (typography plugin), `app/layout.tsx` (metadata + Toaster)
- Generate (via CLI): `components.json`, `components/ui/*`, `lib/utils.ts`

- [ ] **Step 1: Run create-next-app (scaffolds into the existing dir; `.git` + `docs/` are preserved)**

Run (Git Bash):
```bash
cd /c/Users/Developer/mapping-map
npx --yes create-next-app@latest . --ts --app --tailwind --eslint --import-alias "@/*" --use-npm --yes
```
Expected: installs next@16.3.3, react@19.2.8, tailwindcss, eslint; prints `Generating route types... ✓` then `Success! Created mapping-map`. Dev runs via `npm run dev` on `http://localhost:3000`.

- [ ] **Step 2: Initialize shadcn (NON-interactive — `-b` and `-p` are required or the CLI blocks on prompts)**

Run:
```bash
npx --yes shadcn@latest init -b radix -p nova -y --no-monorepo
```
Expected: `Project initialization completed.` Creates `components.json`, `lib/utils.ts` (with `cn()`), rewrites `app/globals.css` (oklch theme + `@custom-variant dark`), installs radix/shadcn deps.

> **Correction:** shadcn CLI 4.x is INTERACTIVE unless you pass `--base`/`-b` and `--preset`/`-p`. Default base is Base UI, not Radix — so `-b radix` is explicit.

- [ ] **Step 3: Add the 11 shadcn components used by the app**

Run:
```bash
npx --yes shadcn@latest add button card dialog input label dropdown-menu avatar badge separator skeleton sonner -y
```
Expected: `Created 11 files:` under `components/ui/`. Also installs `next-themes` + `sonner`.

- [ ] **Step 4: Install data, auth, markdown, and test deps (pinned)**

Run:
```bash
npm install drizzle-orm@0.45.2 @libsql/client@0.17.4
npm install better-auth@1.7.2 @better-auth/drizzle-adapter@1.7.2
npm install @excalidraw/excalidraw@0.18.1
npm install react-markdown@^10.1.0 remark-gfm@^4.0.1 @uiw/react-codemirror@^4.25.11 @codemirror/lang-markdown@^6.5.2 @codemirror/language-data@^6.5.2
npm install @tailwindcss/typography@^0.5.20 framer-motion zod
npm install -D drizzle-kit@0.31.10 vitest@^4 jsdom@^30 @playwright/test@^1.62.1
npx playwright install chromium
```
Expected: all install cleanly. (An `eslint` deprecation warning may print — harmless.)

- [ ] **Step 5: Add package.json scripts**

Edit `package.json` → `scripts` becomes:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "test:e2e:report": "playwright show-report",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

- [ ] **Step 6: Configure tsconfig to keep tests/e2e out of the app type-check**

Edit `tsconfig.json` `exclude` (so `next build`'s type check doesn't choke on test/e2e files):
```json
"exclude": ["node_modules", "e2e", "tests"]
```

- [ ] **Step 7: Add the typography plugin to globals.css**

Edit `app/globals.css` — add this line directly under the existing `@import "tailwindcss";` (before the other `@import`s):
```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 8: Create .env.example and a local dev .env**

Create `.env.example`:
```
# Local dev uses a plain libSQL file (no Turso needed). For Turso, set:
#   DATABASE_URL=libsql://<db>.<region>.turso.io
#   DATABASE_AUTH_TOKEN=<token>
DATABASE_URL=file:./local.db
DATABASE_AUTH_TOKEN=
AUTH_SECRET=replace-with-64-hex-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional — enables email verification + password reset:
RESEND_API_KEY=
```
Create `.env` (copy of the above) with a real secret:
```bash
npx auth@1.7.2 secret
```
Paste the printed secret into `AUTH_SECRET=` in `.env`. (drizzle-kit and Next auto-load `.env`.)

- [ ] **Step 9: Create vitest config + setup**

Create `vitest.config.mts` (use `.mts`, not `.ts` — avoids the ESM/CommonJS configLoader warning):
```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": rootDir } },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
```
Create `vitest.setup.ts`:
```ts
// Set a throwaway env before any lib module is imported by tests.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file::memory:";
process.env.DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? "";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-0000";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
```

- [ ] **Step 10: Create drizzle.config.ts**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
});
```
> `dialect: "turso"` is valid in drizzle-kit 0.31.10 (verified). `migrate` reads credentials only from this config (no `--url` flag in 0.31.10).

- [ ] **Step 11: Update .gitignore**

Append to `.gitignore`:
```
.env
*.db
e2e.db
```

- [ ] **Step 12: Verify dev server boots**

Run:
```bash
npm run dev
```
Expected: `▲ Next.js 16.3.3 (Turbopack)` + `✓ Ready` + `Local: http://localhost:3000`. The default CNA page renders. Then Ctrl-C.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js + shadcn + data/auth/markdown deps + test config"
```

---

### Task 2: Data layer — Drizzle schema + first migration

**Files:**
- Create: `lib/auth-schema.ts`, `lib/schema.ts`, `lib/env.ts`, `lib/db.ts`, `lib/utils.ts` (append `newId`)
- Generate: `drizzle/0000_*.sql`, `drizzle/meta/`

- [ ] **Step 1: Create `lib/auth-schema.ts` (the better-auth auth tables)**

This file is the **verified verbatim output** of `npx auth@1.7.2 generate` (drizzle, sqlite provider, email+password). Hand-writing the exact content is more reliable than re-running the generator (no CLI drift/prompts). Keep it unchanged so better-auth's runtime queries match:

```ts
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    uniqueIndex("account_issuer_accountId_uidx").on(t.issuer, t.accountId),
    index("account_userId_idx").on(t.userId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
```
> **Correction:** better-auth 1.7 added a NOT NULL `account.issuer` column (credential accounts use `local:credential`). Fresh DBs are fine; the generator output above already includes it.

- [ ] **Step 2: Create `lib/env.ts` (typed env access)**

```ts
type Env = {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN?: string;
  AUTH_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
  RESEND_API_KEY?: string;
};

function readEnv(): Env {
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.AUTH_SECRET && "AUTH_SECRET",
    !process.env.NEXT_PUBLIC_APP_URL && "NEXT_PUBLIC_APP_URL",
  ].filter(Boolean) as string[];
  if (missing.length && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return {
    DATABASE_URL: process.env.DATABASE_URL || "file:./local.db",
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN || undefined,
    AUTH_SECRET: process.env.AUTH_SECRET || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
}

export const env = readEnv();
```

- [ ] **Step 3: Create `lib/schema.ts` (app tables + re-export auth tables)**

```ts
import { sqliteTable, text, integer, blob, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
export * from "./auth-schema";

export const maps = sqliteTable("maps", {
  id: text("id").primaryKey(),
  ownerId: text("ownerId").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
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

export const presence = sqliteTable(
  "presence",
  {
    mapId: text("mapId").notNull(),
    userId: text("userId").notNull(),
    lastSeen: integer("lastSeen", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.mapId, t.userId] })],
);
```

- [ ] **Step 4: Create `lib/db.ts` (singleton libsql client + drizzle)**

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "./env";
import * as schema from "./schema";

// globalThis guard so Next dev HMR doesn't leak libsql handles on each reload.
const g = globalThis as unknown as { __libsqlClient?: ReturnType<typeof createClient> };
const client = g.__libsqlClient ?? createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});
if (process.env.NODE_ENV !== "production") g.__libsqlClient = client;

export const db = drizzle(client, { schema });
```

- [ ] **Step 5: Add `newId()` to `lib/utils.ts`**

The shadcn-generated `lib/utils.ts` already has `cn()`. Append:
```ts
export function newId(): string {
  return crypto.randomUUID();
}
```
> **Correction (verify):** shadcn CLI 4.19 writes `cn()` as `return twMerge(clsx(inputs))` (a generated quirk). If `tsc`/build complains about that line, correct it to `return twMerge(clsx(inputs));` and confirm `next build` still passes. (In the reference scaffold the build passed as-is; fix only if it errors.)

- [ ] **Step 6: Generate the first migration**

Run:
```bash
npm run db:generate
```
Expected: creates `drizzle/0000_*.sql` + `drizzle/meta/_journal.json`. Open the SQL — it must contain `CREATE TABLE "user"`, `"session"`, `"account"`, `"verification"`, `"maps"`, `"map_collaborators"`, `"map_state"`, `"map_nodes"`, `"map_files"`, `"presence"`.

- [ ] **Step 7: Apply the migration to the local dev DB**

Run:
```bash
npm run db:migrate
```
Expected: `✓ migrations applied successfully` (creates `local.db`).

- [ ] **Step 8: Smoke-check the tables exist**

Run:
```bash
npx drizzle-kit studio
```
Expected: Drizzle Studio opens; all 10 tables listed. Close it.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: drizzle schema (auth + maps/state/nodes/files/presence) + first migration"
```

---

### Task 3: better-auth server (config + route + requireUser guard)

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...all]/route.ts`, `lib/guards.ts`
- Test: `tests/integration/api.test.ts` (scaffolded here, extended in Task 17)

- [ ] **Step 1: Create `lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  database: drizzleAdapter(db, { provider: "sqlite" }),
});
```
> **Correction:** `drizzleAdapter(db, { provider: "sqlite" })` — `provider` is REQUIRED (both the CLI generator and the adapter read it). The adapter reads the schema from `db` (created with `{ schema }`), so no separate `schema` arg is needed here.

- [ ] **Step 2: Create the auth API route**

Create `app/api/auth/[...all]/route.ts`:
```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Create `lib/guards.ts` (requireUser first)**

```ts
import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { mapCollaborators, maps } from "./schema";
import { eq, and } from "drizzle-orm";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean };

export async function requireUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
}

export type MapRole = "owner" | "editor" | "viewer";
export const ROLE_RANK: Record<MapRole, number> = { viewer: 1, editor: 2, owner: 3 };

export type RoleCheck =
  | { ok: true; user: SessionUser; role: MapRole }
  | { ok: false; status: number; body: { error: string; message: string } };

export async function requireMapRole(mapId: string, minRole: MapRole): Promise<RoleCheck> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, status: 401, body: { error: "unauthorized", message: "Silakan masuk dulu." } };
  }
  const mapRows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(eq(maps.id, mapId))
    .limit(1);
  if (mapRows.length === 0) {
    return { ok: false, status: 404, body: { error: "not_found", message: "Peta tidak ditemukan." } };
  }
  const rows = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, user.id)))
    .limit(1);
  const role = (rows[0]?.role as MapRole | undefined) ?? "viewer";
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Anda tidak punya akses." } };
  }
  return { ok: true, user, role };
}
```

- [ ] **Step 4: Write the failing integration test (sign-up + get-session)**

Create `tests/integration/api.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { auth } from "@/lib/auth";

async function signUp(email: string, name = "Tester"): Promise<string> {
  const res = await POST(
    new Request(`http://localhost:3000/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, name, password: "Password123!" }),
    }),
  );
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie")!;
  expect(setCookie).toContain("better-auth.session_token=");
  return setCookie.split(";")[0]; // full signed cookie pair
}

describe("better-auth (email+password)", () => {
  it("signs up and returns a usable session cookie", async () => {
    const cookie = await signUp(`u${Date.now()}@example.com`);
    const sess = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(sess).not.toBeNull();
    expect(sess!.user.email).toBeTruthy();
  });
});
```
> **Correction:** in 1.7.2 the cookie is `better-auth.session_token` and its VALUE is `token.<signature>` — you MUST pass the whole first `;`-segment (not the raw token) or `getSession` returns `null`. Under Vitest (`NODE_ENV=test`) better-auth skips origin checks, so no Origin header is strictly required (kept for clarity).

- [ ] **Step 5: Run the test — verify it passes**

Run:
```bash
npm run test -- tests/integration/api.test.ts
```
Expected: `1 passed`. (If it fails with "no such table", the migration from Task 2 wasn't applied to the DB the test uses — the test uses `file::memory:` from `vitest.setup.ts`, so ensure the schema is created in-memory. See Step 6.)

- [ ] **Step 6: Ensure in-memory test DB is migrated before tests run**

Because the test uses `file::memory:` (fresh, empty) on every run, better-auth will fail with `no such table: user`. Add a migration bootstrap to `vitest.setup.ts` — append at the end:
```ts
// Create tables in the in-memory DB used by tests.
import { db } from "@/lib/db";
import { migrate } from "drizzle-orm/libsql/migrator";

void (async () => {
  // For an in-memory file DB, run the generated SQL directly.
  // (Simplest reliable path: apply each migration file's SQL.)
  await migrate(db, { migrationsFolder: "./drizzle" });
})();
```
> `migrate()` against `file::memory:` works because the migrator tracks `__drizzle_migrations` in the same in-memory instance for the test's lifetime. If `migrate` reports "no migrations folder found" due to cwd, run vitest from the project root (it is). Re-run Step 5 — now `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: better-auth (email+password) + auth route + requireUser/requireMapRole guards + auth test"
```

---

## PHASE 1 — AUTH UI + LANDING + MAPS + DASHBOARD

### Task 4: Auth pages (register / login / reset)

**Files:**
- Create: `components/auth/auth-form.tsx`, `lib/api-client.ts`, `app/(auth)/layout.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/reset-password/page.tsx`
- Modify: `app/layout.tsx` (Toaster)

- [ ] **Step 1: Create `lib/api-client.ts` (client fetch wrapper)**

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let code = "internal";
    let message = `Gagal (status ${res.status})`;
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      code = j.error ?? code;
      message = j.message ?? message;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(res.status, code, message);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 2: Create `components/auth/auth-form.tsx`**

A single client component handling both register and login via a `mode` prop. Uses better-auth client endpoints (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`). On success, redirects to `/maps`.

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Mode = "register" | "login";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "register" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const body = mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(j.message ?? (mode === "register" ? "Gagal mendaftar" : "Gagal masuk"));
        return;
      }
      toast.success(mode === "register" ? "Akun dibuat" : "Selamat datang");
      router.push("/maps");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "register" ? "Buat akun" : "Masuk"}</CardTitle>
        <CardDescription>
          {mode === "register" ? "Mulai petakan idemu." : "Lanjutkan ke peta Anda."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "..." : mode === "register" ? "Daftar" : "Masuk"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "register" ? (
            <>
              Sudah punya akun?{" "}
              <Link href="/login" className="font-medium underline">
                Masuk
              </Link>
            </>
          ) : (
            <>
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium underline">
                Daftar
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Create the three auth pages**

`app/(auth)/register/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Daftar — Mapping" };
export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
```
`app/(auth)/login/page.tsx`:
```tsx
import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Masuk — Mapping" };
export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```
`app/(auth)/reset-password/page.tsx` (disabled until Resend is configured — per spec, reset link is hidden in MVP; this page handles the `?token=` case and shows a friendly message otherwise):
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ResetPasswordPage({
  searchParams: sp,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await sp;
  const token = params.token as string | undefined;
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Reset kata sandi</h1>
      {token ? (
        <p>Fitur reset via email belum diaktifkan di lingkungan ini. Hubungi admin.</p>
      ) : (
        <p>Link reset tidak valid atau tidak ditemukan.</p>
      )}
      <Button asChild>
        <Link href="/login">Kembali ke halaman masuk</Link>
      </Button>
    </div>
  );
}
```
> `searchParams` is a Promise in Next 15/16 — await it.

- [ ] **Step 5: Mount the Toaster in the root layout**

Edit `app/layout.tsx` — inside `<body>`, wrap `{children}` with the Toaster (from shadcn's `components/ui/sonner.tsx`, which uses `next-themes`):
```tsx
import { Toaster } from "@/components/ui/sonner";
// ...
<body className="min-h-full flex flex-col">
  <Toaster richColors position="top-center" />
  {children}
</body>
```
> The CNA layout uses `LayoutProps<"/">` (Next 16 route typegen). Keep that signature; only add the import and the `<Toaster/>`.

- [ ] **Step 6: Run dev, verify the flow manually**

Run:
```bash
npm run dev
```
In browser: `http://localhost:3000/register` → fill form → Daftar → lands on `/maps` (will 404 until Task 7, that's expected). `http://localhost:3000/login` → log in with the same account → `/maps`. Both set the `better-auth.session_token` cookie (check DevTools → Application → Cookies).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: auth pages (register/login/reset) + api client + toaster"
```

---

### Task 5: Landing page

**Files:**
- Create: `components/landing/hero.tsx`, `components/landing/features.tsx`, `components/landing/landing-footer.tsx`, `components/landing/demo-canvas.tsx`
- Replace: `app/page.tsx`

- [ ] **Step 1: Create `components/landing/features.tsx`**

```tsx
import { Link } from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { title: "Kanvas tak terbatas", body: "Taruh node di mana saja. Bebas menggambar, menghubungkan, dan menata seperti papan putih." },
  { title: "Klik node → detail Markdown", body: "Setiap node menyimpan catatan Markdown lengkap — heading, tabel, blok kode, list." },
  { title: "Kolaborasi real-time", body: "Undang rekan, dan lihat perubahan mereka muncul dalam hitungan detik." },
  { title: "Semua tersimpan otomatis", body: "Tanpa tombol simpan. Peta dan catatanmu tersimpan di cloud." },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild size="lg">
          <Link href="/register">Mulai sekarang — gratis</Link>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/landing/demo-canvas.tsx`**

A small, lightweight animated SVG "fake canvas" (NOT the full Excalidraw — that would bloat the landing bundle). It visually demonstrates nodes + connecting arrows so the landing doesn't feel generic.

```tsx
"use client";

import { motion } from "framer-motion";

export function DemoCanvas() {
  const nodes = [
    { x: 120, y: 60, w: 150, h: 48, label: "API Response" },
    { x: 320, y: 160, w: 150, h: 48, label: "Table: users" },
    { x: 90, y: 240, w: 150, h: 48, label: "Schema" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-white/5 shadow-xl dark:bg-black/40">
      <svg viewBox="0 0 480 340" className="h-auto w-full" role="img" aria-label="Demo mind map">
        {/* connecting arrows */}
        <motion.path
          d="M 205 108 Q 270 130 320 180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6"
          className="text-primary/60"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M 170 108 Q 120 180 165 240"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6"
          className="text-primary/60"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
        />
        {nodes.map((n, i) => (
          <motion.g key={n.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * i, duration: 0.4 }}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill="var(--primary)" fillOpacity={0.12} stroke="var(--primary)" strokeWidth={1.5} />
            <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 5} textAnchor="middle" className="fill-foreground" fontSize={15} fontWeight={600}>
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/landing/hero.tsx`**

```tsx
import { motion } from "framer-motion";
import { Link } from "next/link";
import { Button } from "@/components/ui/button";
import { DemoCanvas } from "./demo-canvas";

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Petakan ide &amp; catatan teknismu
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Mind map interaktif bergaya Excalidraw. Klik node untuk membuka detail
          Markdown, dan kolaborasi dengan tim secara langsung.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Coba gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
        <DemoCanvas />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 4: Create `components/landing/landing-footer.tsx`**

```tsx
export function LandingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mapping. Dibuat dengan Next.js.
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Replace `app/page.tsx`**

```tsx
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <main className="flex-1">
      <Hero />
      <Features />
      <LandingFooter />
    </main>
  );
}
```

- [ ] **Step 6: Verify landing renders**

Run:
```bash
npm run dev
```
Open `http://localhost:3000/` → hero + animated SVG demo + features + CTA. Check it's responsive (resize).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: landing page (hero, animated demo canvas, features, footer)"
```

---

> **Precedence note:** If this plan and `docs/superpowers/plans/_shared-contract.md` differ, THIS PLAN wins (the contract was a drafting aid; the plan encodes the final, verified decisions — e.g. image flow via dirty-files in `POST /state`, and `GET`-only files routes).

### Task 6: Maps API (list / create / one / rename / delete) + validators

**Files:**
- Create: `lib/validators.ts`, `app/api/maps/route.ts`, `app/api/maps/[id]/route.ts`
- Test: `tests/unit/validators.test.ts`, `tests/integration/api.test.ts` (maps block)

- [ ] **Step 1: Create `lib/validators.ts`**

```ts
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
  scene: z.record(z.unknown()),
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
```

- [ ] **Step 2: Write failing validator tests**

Create `tests/unit/validators.test.ts`:
```ts
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
```

- [ ] **Step 3: Run tests — verify pass**

Run:
```bash
npm run test -- tests/unit/validators.test.ts
```
Expected: `5 passed`.

- [ ] **Step 4: Create `app/api/maps/route.ts` (GET list + POST create)**

```ts
import { db } from "@/lib/db";
import { maps, mapCollaborators } from "@/lib/schema";
import { requireUser } from "@/lib/guards";
import { createMapSchema } from "@/lib/validators";
import { newId } from "@/lib/utils";
import { desc, or, eq, and } from "drizzle-orm";

export const runtime = "nodejs";

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError(401, "unauthorized", "Silakan masuk dulu.");
  const rows = await db
    .select({
      id: maps.id,
      title: maps.title,
      description: maps.description,
      isArchived: maps.isArchived,
      updatedAt: maps.updatedAt,
      ownerId: maps.ownerId,
      role: mapCollaborators.role,
    })
    .from(maps)
    .leftJoin(mapCollaborators, and(eq(mapCollaborators.mapId, maps.id), eq(mapCollaborators.userId, user.id)))
    .where(or(eq(maps.ownerId, user.id), eq(mapCollaborators.userId, user.id)))
    .orderBy(desc(maps.updatedAt));
  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isArchived: r.isArchived,
    updatedAt: r.updatedAt,
    mine: r.ownerId === user.id,
    role: (r.role as "owner" | "editor" | "viewer" | undefined) ?? (r.ownerId === user.id ? "owner" : "viewer"),
  }));
  return Response.json({ data });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError(401, "unauthorized", "Silakan masuk dulu.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Body JSON tidak valid.");
  }
  const parsed = createMapSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const id = newId();
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx.insert(maps).values({
      id,
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      createdAt: now,
      updatedAt: now,
    });
    // INVARIANT: owner always has a collaborator row (requireMapRole relies on it)
    await tx.insert(mapCollaborators).values({ mapId: id, userId: user.id, role: "owner", createdAt: now });
  });
  return Response.json({ data: { id, title: parsed.data.title } }, { status: 201 });
}
```

- [ ] **Step 5: Create `app/api/maps/[id]/route.ts` (GET one / PATCH rename-archive / DELETE)**

```ts
import { db } from "@/lib/db";
import { maps, mapState, mapNodes, mapFiles, presence, user as userTable } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { renameMapSchema } from "@/lib/validators";
import { eq, inArray } from "drizzle-orm";
import { mapCollaborators } from "@/lib/schema";

export const runtime = "nodejs";

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const mapRows = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
  const map = mapRows[0];
  if (!map) return jsonError(404, "not_found", "Peta tidak ditemukan.");
  const stateRows = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
  const state = stateRows[0]
    ? { revision: stateRows[0].revision, scene: JSON.parse(stateRows[0].scene) }
    : null;
  const nodes = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id));
  const files = await db
    .select({ id: mapFiles.id, fileId: mapFiles.fileId, filename: mapFiles.filename, mime: mapFiles.mime, createdAt: mapFiles.createdAt })
    .from(mapFiles)
    .where(eq(mapFiles.mapId, id));
  const collaborators = await (async () => {
    const rows = await db
      .select({ userId: mapCollaborators.userId, role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(eq(mapCollaborators.mapId, id));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.userId);
    const users = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.id, ids));
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      userId: r.userId,
      name: byId.get(r.userId)?.name ?? "Unknown",
      email: byId.get(r.userId)?.email ?? "",
      role: r.role as "owner" | "editor" | "viewer",
    }));
  })();
  return Response.json({
    data: {
      map: { id: map.id, title: map.title, description: map.description, isArchived: map.isArchived, role: res.role },
      state,
      nodes: nodes.map((n) => ({ id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd, updatedAt: n.updatedAt })),
      files: files.map((f) => ({ id: f.id, fileId: f.fileId, filename: f.filename, mime: f.mime, size: 0, createdAt: f.createdAt })),
      collaborators,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Body JSON tidak valid.");
  }
  const parsed = renameMapSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const values: Record<string, unknown> = { updatedAt: Date.now() };
  if (parsed.data.title !== undefined) values.title = parsed.data.title;
  if (parsed.data.description !== undefined) values.description = parsed.data.description;
  if (parsed.data.isArchived !== undefined) values.isArchived = parsed.data.isArchived;
  const rows = await db.update(maps).set(values).where(eq(maps.id, id)).returning();
  return Response.json({ data: { ...rows[0] } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  await db.delete(maps).where(eq(maps.id, id)); // cascades to state/nodes/files/collaborators
  await db.delete(presence).where(eq(presence.mapId, id));
  return Response.json({ data: { ok: true } });
}
```

> `map_files` BLOB size isn't exposed by libSQL select, so the list reports `size: 0` — the editor hydrates images from `state.scene.files` dataURLs and doesn't use this field.

- [ ] **Step 6: Add an integration test for create + list + get/patch/delete**

Append to `tests/integration/api.test.ts`:
```ts
import { POST as postMaps, GET as getMaps } from "@/app/api/maps/route";
import { GET as getMap, PATCH as patchMap, DELETE as deleteMap } from "@/app/api/maps/[id]/route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("maps API", () => {
  it("creates a map (with owner collaborator) and lists it", async () => {
    const cookie = await signUp(`m${Date.now()}@example.com`);
    const createRes = await postMaps(
      new Request("http://localhost:3000/api/maps", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ title: "Peta Uji", description: "" }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { data: { id: string } };
    expect(created.data.id).toBeTruthy();

    const listRes = await getMaps(
      new Request("http://localhost:3000/api/maps", {
        method: "GET",
        headers: { cookie },
      }),
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { data: Array<{ id: string; title: string; role: string }> };
    expect(list.data.some((m) => m.id === created.data.id && m.role === "owner")).toBe(true);
  });
  it("rejects create when not signed in", async () => {
    const res = await postMaps(
      new Request("http://localhost:3000/api/maps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "X" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("gets one map, renames it (owner), and deletes it", async () => {
    const cookie = await signUp(`d${Date.now()}@example.com`);
    const created = (await (
      await postMaps(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Akan dihapus" }),
        }),
      )
    ).json()) as { data: { id: string } };
    const id = created.data.id;

    const one = await getMap(new Request("http://localhost:3000/api/maps/" + id, { headers: { cookie } }), ctx(id));
    expect(one.status).toBe(200);
    const oneBody = (await one.json()) as { data: { map: { title: string; role: string }; state: null } };
    expect(oneBody.data.map.title).toBe("Akan dihapus");
    expect(oneBody.data.map.role).toBe("owner");
    expect(oneBody.data.state).toBeNull(); // no state saved yet

    const patched = await patchMap(
      new Request("http://localhost:3000/api/maps/" + id, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ title: "Ganti nama", isArchived: true }),
      }),
      ctx(id),
    );
    expect(patched.status).toBe(200);
    const patchedBody = (await patched.json()) as { data: { title: string; isArchived: boolean } };
    expect(patchedBody.data.title).toBe("Ganti nama");
    expect(patchedBody.data.isArchived).toBe(true);

    const del = await deleteMap(new Request("http://localhost:3000/api/maps/" + id, { method: "DELETE", headers: { cookie } }), ctx(id));
    expect(del.status).toBe(200);
    const after = await getMap(new Request("http://localhost:3000/api/maps/" + id, { headers: { cookie } }), ctx(id));
    expect(after.status).toBe(404);
  });
});
```
> **Note:** `getMaps`/`postMaps` (static route) take 1 arg; `getMap`/`patchMap`/`deleteMap` (dynamic route) take 2 args with `{ params: Promise<{id}> }` — verified for Next 16 route typegen. The `cookie` header carries the session.

- [ ] **Step 7: Run integration tests — verify pass**

Run:
```bash
npm run test -- tests/integration/api.test.ts
```
Expected: all pass (1 auth test + 3 maps tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: maps API (list/create/get/patch/delete) + zod validators + tests"
```

---

### Task 7: Dashboard UI (list maps, create, actions)

**Files:**
- Create: `app/maps/page.tsx` (server: guard), `components/maps/map-card.tsx`, `components/maps/new-map-dialog.tsx`

- [ ] **Step 1: Create `app/maps/page.tsx` (server component, redirects if not authed)**

```tsx
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { db } from "@/lib/db";
import { maps, mapCollaborators } from "@/lib/schema";
import { or, eq, and, desc } from "drizzle-orm";
import { MapCard } from "@/components/maps/map-card";
import { NewMapDialog } from "@/components/maps/new-map-dialog";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Peta Saya — Mapping" };

export default async function MapsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      id: maps.id,
      title: maps.title,
      description: maps.description,
      isArchived: maps.isArchived,
      updatedAt: maps.updatedAt,
      ownerId: maps.ownerId,
      role: mapCollaborators.role,
    })
    .from(maps)
    .leftJoin(mapCollaborators, and(eq(mapCollaborators.mapId, maps.id), eq(mapCollaborators.userId, user.id)))
    .where(or(eq(maps.ownerId, user.id), eq(mapCollaborators.userId, user.id)))
    .orderBy(desc(maps.updatedAt));

  const mapsData = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isArchived: r.isArchived,
    updatedAt: r.updatedAt,
    mine: r.ownerId === user.id,
    role: (r.role as "owner" | "editor" | "viewer" | undefined) ?? (r.ownerId === user.id ? "owner" : "viewer"),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Peta Saya</h1>
          <p className="text-sm text-muted-foreground">Halo, {user.name}</p>
        </div>
        <NewMapDialog />
      </div>
      {mapsData.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Belum ada peta. Klik “Peta baru” untuk memulai.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mapsData.map((m) => (
            <MapCard key={m.id} map={m} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/maps/new-map-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

export function NewMapDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { id } = await api.post<{ id: string }>("/api/maps", { title: title.trim(), description: "" });
      setOpen(false);
      setTitle("");
      router.push(`/maps/${id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membuat peta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Peta baru</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat peta baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="map-title">Judul</Label>
            <Input id="map-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Arsitektur API" />
          </div>
          <Button className="w-full" onClick={onCreate} disabled={busy || !title.trim()}>
            {busy ? "..." : "Buat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `components/maps/map-card.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MapItem = {
  id: string;
  title: string;
  description: string;
  isArchived: boolean;
  updatedAt: number;
  mine: boolean;
  role: "owner" | "editor" | "viewer";
};

export function MapCard({ map }: { map: MapItem }) {
  const router = useRouter();

  async function patch(p: Record<string, unknown>) {
    try {
      await api.patch(`/api/maps/${map.id}`, p);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memperbarui");
    }
  }
  async function remove() {
    if (!confirm(`Hapus peta "${map.title}"?`)) return;
    try {
      await api.delete(`/api/maps/${map.id}`);
      toast.success("Peta dihapus");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus");
    }
  }

  return (
    <Card className="group relative">
      <Link href={`/maps/${map.id}`} className="block">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{map.title}</h3>
            {map.role === "owner" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1 opacity-60 hover:bg-muted group-hover:opacity-100">
                  <span className="sr-only">Opsi</span>···
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => patch({ isArchived: !map.isArchived })}>
                    {map.isArchived ? "Unarchive" : "Arsipkan"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={remove}>
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{map.description || "—"}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={map.role === "owner" ? "default" : "secondary"}>
              {map.role === "owner" ? "Milik saya" : map.role === "editor" ? "Editor" : "Viewer"}
            </Badge>
            {map.isArchived && <Badge variant="outline">Arsip</Badge>}
            <span>{new Date(map.updatedAt).toLocaleDateString("id-ID")}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
```

- [ ] **Step 4: Verify dashboard in browser**

Run `npm run dev`. Register a new account → `/maps` → create a map via the dialog → card appears with role "Milik saya". Archive & delete via the `···` menu work (card disappears/updates).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: dashboard (map list, new-map dialog, card actions)"
```

---

## PHASE 2 — EDITOR CORE (Excalidraw + nodes + Markdown + sync)

> **Excalidraw 0.18.1 verified corrections (read before coding Task 9–10):**
> 1. The API prop is `excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void` — NOT `onExcalidrawAPI` (that name is a 0.19 prerelease rename).
> 2. There is **NO `user={{name,color}}` prop** in 0.18.1 — do not pass it (TS error). The only user-adjacent prop is `name` (scene title in the footer).
> 3. There is **NO `api.registerCustomKeybinding`** — use a `window` keydown listener (plain "N" is unbound by any built-in action).
> 4. File types are `BinaryFileData`/`BinaryFiles` (NO `FileInfo` type); `FileId`/`DataURL` are branded strings (cast `as FileId`/`as DataURL` when building from plain strings).
> 5. `exportToBlob` is a **standalone named export** (NOT an api method); options are `mimeType/quality/exportPadding/maxWidthOrHeight/getDimensions/exportingFrame/appState` — there is NO `exportWithBorder`.
> 6. `updateScene` takes NO `files` param. To inject image data use `api.addFiles(BinaryFileData[])`; for remote/initial loads use `captureUpdate: CaptureUpdateAction.NEVER` so local undo/redo is not polluted.
> 7. `reconcileElements`' second param is branded (`RemoteExcalidrawElement`) — cast via `as unknown as RemoteExcalidrawElement[]`.
> 8. `onPointerUp` fires on every pointer release (including drags) — guard with `pointerDownState.drag.hasOccurred`.
> 9. CSS: `import "@excalidraw/excalidraw/index.css";` (the package's conditional export picks dev/prod).
> 10. Saved scene shape: `{ type: "excalidraw", version: 2, source, elements, appState, files }` (runtime `isValidExcalidrawData` checks `type === "excalidraw"`).

### Task 8: Scene helpers + unit tests (`lib/scene.ts`)

**Files:**
- Create: `lib/scene.ts`
- Test: `tests/unit/scene.test.ts`

- [ ] **Step 1: Write the failing unit tests first**

Create `tests/unit/scene.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  toScenePayload,
  sceneSizeBytes,
  mergeFiles,
  parseScene,
  MAX_SCENE_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/scene";
import { convertToExcalidrawElements, reconcileElements } from "@excalidraw/excalidraw";
import type { AppState } from "@excalidraw/excalidraw/types";

describe("scene helpers", () => {
  it("toScenePayload emits the excalidraw scene shape with a SAFE appState subset", () => {
    const els = convertToExcalidrawElements([{ type: "rectangle", x: 0, y: 0, width: 10, height: 10 }]);
    const appState = {
      viewBackgroundColor: "#ff0000",
      selectedElementIds: { a: true }, // volatile — must NOT be persisted
      scrollX: 123, // volatile
    } as unknown as AppState;
    const p = toScenePayload(els, appState, {});
    expect(p.type).toBe("excalidraw");
    expect(p.version).toBe(2);
    expect(p.elements.length).toBeGreaterThan(0);
    expect(p.appState.viewBackgroundColor).toBe("#ff0000");
    expect(p.appState.selectedElementIds).toBeUndefined();
    expect(p.appState.scrollX).toBeUndefined();
  });

  it("sceneSizeBytes measures the JSON payload", () => {
    const p = toScenePayload([], {} as AppState, {});
    expect(sceneSizeBytes(p)).toBeGreaterThan(20);
  });

  it("mergeFiles unions both maps, local wins on conflict", () => {
    const merged = mergeFiles({ a: 1 as never }, { a: 2 as never, b: 3 as never });
    expect(merged).toEqual({ a: 1, b: 3 });
  });

  it("parseScene rejects garbage and accepts a valid scene", () => {
    expect(parseScene("not-json")).toBeNull();
    const ok = parseScene(JSON.stringify({ type: "excalidraw", version: 2, elements: [] }));
    expect(ok).not.toBeNull();
  });

  it("reports the 4MB scene cap and 2MB image cap", () => {
    expect(MAX_SCENE_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
  });

  it("reconcileElements merges two element sets (both survive when ids differ)", () => {
    const [rectA] = convertToExcalidrawElements([{ type: "rectangle", x: 0, y: 0, width: 100, height: 50 }]);
    const [rectB] = convertToExcalidrawElements([{ type: "ellipse", x: 200, y: 0, width: 100, height: 50 }]);
    // pass a minimally-safe appState (reconcileElements reads appState fields)
    const safeAppState = { selectedElementIds: {}, scrollX: 0, scrollY: 0 } as unknown as AppState;
    const merged = reconcileElements([rectA], [rectB] as never[], safeAppState);
    expect(merged.map((e) => e.id)).toEqual(expect.arrayContaining([rectA.id, rectB.id]));
  });
});
```
> If the last test errors because `reconcileElements` needs a richer `AppState` in the test env, keep the first five tests and move the reconcile assertion into the e2e flow (Task 17). Do NOT weaken the first five.

- [ ] **Step 2: Run tests — verify they FAIL (module missing)**

Run:
```bash
npm run test -- tests/unit/scene.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/scene'".

- [ ] **Step 3: Implement `lib/scene.ts`**

```ts
import { reconcileElements, restoreElements } from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/types";
import type {
  ReconciledExcalidrawElement,
  RemoteExcalidrawElement,
} from "@excalidraw/excalidraw/data/reconcile";

export const MAX_SCENE_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5MB body limit
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Persisted scene = the excalidraw JSON shape (type must be "excalidraw"). */
export type ScenePayload = {
  type: string;
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

const APPSTATE_PERSIST_KEYS = ["viewBackgroundColor", "gridSize"] as const;

export function toScenePayload(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): ScenePayload {
  const safe: Record<string, unknown> = {};
  for (const k of APPSTATE_PERSIST_KEYS) {
    safe[k] = appState[k];
  }
  return {
    type: "excalidraw",
    version: 2,
    source: "mapping-app",
    elements: elements.map((el) => el as unknown as ExcalidrawElement),
    appState: safe as Partial<AppState>,
    files: { ...files },
  };
}

export function sceneSizeBytes(p: ScenePayload): number {
  return new TextEncoder().encode(JSON.stringify(p)).length;
}

export function mergeFiles(local: BinaryFiles, remote: BinaryFiles): BinaryFiles {
  return { ...remote, ...local };
}

/**
 * Per-element last-write-wins merge of the local (in-canvas) scene with a
 * remote persisted scene. Returns reconciled elements + unioned files.
 */
export function mergeScenes(
  localElements: readonly OrderedExcalidrawElement[],
  localAppState: AppState,
  localFiles: BinaryFiles,
  remote: ScenePayload,
): { elements: ReconciledExcalidrawElement[]; files: BinaryFiles } {
  const restored = restoreElements(remote.elements ?? null, null);
  const remoteEl = restored as unknown as RemoteExcalidrawElement[];
  const elements = reconcileElements(localElements, remoteEl, localAppState);
  return { elements, files: mergeFiles(localFiles, remote.files ?? {}) };
}

export function parseScene(raw: string): ScenePayload | null {
  try {
    const p = JSON.parse(raw) as ScenePayload;
    return p && Array.isArray(p.elements) ? p : null;
  } catch {
    return null;
  }
}
```
> `ReconciledExcalidrawElement`/`RemoteExcalidrawElement` live in `@excalidraw/excalidraw/data/reconcile` (the package's `"./*"` types export maps it to the shipped `.d.ts`). If that import path fails in your toolchain, fall back to `unknown[]` for the two params and keep the `as unknown as` cast.

- [ ] **Step 4: Run tests — verify they PASS**

Run:
```bash
npm run test -- tests/unit/scene.test.ts
```
Expected: all pass (6, or 5 if you applied the fallback in Step 1's note).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scene helpers (toScenePayload/mergeScenes/size caps) + unit tests"
```

---

### Task 9: Editor page + CanvasBridge (the Excalidraw wrapper)

**Files:**
- Create: `components/editor/excalidraw-lazy.tsx`, `components/editor/canvas-bridge.tsx`, `components/editor/editor-client.tsx`, `app/maps/[id]/page.tsx`

- [ ] **Step 1: Create `components/editor/excalidraw-lazy.tsx` (SSR-off loader + CSS)**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw as ComponentType<Record<string, unknown>>),
  { ssr: false },
);

export default Excalidraw;
```
> Excalidraw does not support SSR — it must be loaded client-only via `next/dynamic` with `ssr: false` (official App Router integration pattern).

- [ ] **Step 2: Create `components/editor/canvas-bridge.tsx`**

This is the ONLY component that talks to the Excalidraw API. The parent orchestrator controls it through `handleRef`.

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToBlob,
  serializeAsJSON,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  OrderedExcalidrawElement,
  PointerDownState,
} from "@excalidraw/excalidraw/types";
import { newId } from "@/lib/utils";
import { mergeScenes, type ScenePayload } from "@/lib/scene";
import ExcalidrawLazy from "./excalidraw-lazy";

export type SceneSnapshot = {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type CanvasHandle = {
  /** Create a labeled rectangle node at the viewport center. Returns ids or null. */
  addNodeAtCenter(title: string): { nodeId: string; elementId: string } | null;
  /** Apply a remote persisted scene WITHOUT polluting local undo/redo. */
  applyRemote(remote: ScenePayload): void;
  /** Soft-delete an element by id (used to roll back a failed node save). */
  removeElement(elementId: string): void;
  /** Current serializable snapshot (elements + appState + files). */
  getSnapshot(): SceneSnapshot | null;
  /** PNG of the whole scene as a Blob. */
  exportPng(): Promise<Blob>;
  /** JSON of the whole scene as a string. */
  exportJson(): string | null;
  /** Toggle read-only imperatively (prop toggle would remount and lose state). */
  setViewMode(view: boolean): void;
};

type Props = {
  initial: ScenePayload | null;
  viewMode: boolean;
  onSceneChange: (snap: SceneSnapshot) => void;
  onNodeClick: (nodeId: string) => void;
  onEmptyClick: () => void;
  handleRef: React.MutableRefObject<CanvasHandle | null>;
};

export function CanvasBridge({ initial, viewMode, onSceneChange, onNodeClick, onEmptyClick, handleRef }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const onExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      handleRef.current = {
        addNodeAtCenter(title) {
          const a = apiRef.current;
          if (!a) return null;
          const nodeId = newId();
          const st = a.getAppState();
          const x = -st.scrollX + st.width / 2 - 100;
          const y = -st.scrollY + st.height / 2 - 40;
          const created = convertToExcalidrawElements([
            {
              type: "rectangle",
              x,
              y,
              width: 200,
              height: 80,
              backgroundColor: "#a5d8ff",
              strokeColor: "#1971c2",
              customData: { nodeId },
              label: { text: title, fontSize: 20 },
            },
          ]);
          const elementId = created[0]?.id ?? "";
          a.updateScene({
            elements: [...a.getSceneElements(), ...created],
            captureUpdate: CaptureUpdateAction.IMMEDIATELY, // user action => undoable
          });
          return { nodeId, elementId };
        },
        applyRemote(remote) {
          const a = apiRef.current;
          if (!a) return;
          const { elements } = mergeScenes(a.getSceneElements(), a.getAppState(), a.getFiles(), remote);
          a.updateScene({
            elements,
            appState: remote.appState as AppState,
            captureUpdate: CaptureUpdateAction.NEVER, // remote => never pollutes local undo/redo
          });
        },
        removeElement(elementId) {
          const a = apiRef.current;
          if (!a) return;
          a.updateScene({
            elements: a.getSceneElements().map((el) => (el.id === elementId ? { ...el, isDeleted: true } : el)),
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
        },
        getSnapshot() {
          const a = apiRef.current;
          if (!a) return null;
          return { elements: a.getSceneElements(), appState: a.getAppState(), files: a.getFiles() };
        },
        exportPng() {
          const a = apiRef.current;
          if (!a) return Promise.reject(new Error("canvas not ready"));
          return exportToBlob({
            elements: a.getSceneElements() as never[],
            appState: a.getAppState(),
            files: a.getFiles(),
            mimeType: MIME_TYPES.png,
          });
        },
        exportJson() {
          const a = apiRef.current;
          if (!a) return null;
          return serializeAsJSON(a.getSceneElements(), a.getAppState(), a.getFiles(), "database");
        },
        setViewMode(view) {
          const a = apiRef.current;
          if (!a) return;
          a.updateScene({ appState: { viewModeEnabled: view } });
        },
      };
    },
    [handleRef],
  );

  const onChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onSceneChange({ elements, appState, files });
    },
    [onSceneChange],
  );

  const onPointerUp = useCallback(
    (_activeTool: unknown, pointerDownState: PointerDownState) => {
      if (pointerDownState.drag.hasOccurred) return; // it was a drag, not a click
      const el = pointerDownState.hit.element;
      if (!el) {
        onEmptyClick();
        return;
      }
      if (el.type === "rectangle" || el.type === "ellipse") {
        const nodeId = (el.customData as { nodeId?: string } | undefined)?.nodeId;
        if (nodeId) {
          onNodeClick(nodeId);
          return;
        }
      }
      onEmptyClick();
    },
    [onNodeClick, onEmptyClick],
  );

  const initialData = useCallback(() => (initial ? { ...initial, scrollToContent: true } : null), [initial]);

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { viewModeEnabled: viewMode } });
  }, [viewMode]);

  return (
    <ExcalidrawLazy
      initialData={initialData}
      onChange={onChange}
      excalidrawAPI={onExcalidrawAPI}
      onPointerUp={onPointerUp}
      viewModeEnabled={viewMode}
    />
  );
}
```

- [ ] **Step 3: Create `app/maps/[id]/page.tsx` (server: guard + data)**

```tsx
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { maps, mapState, mapNodes, mapCollaborators } from "@/lib/schema";
import { requireUser } from "@/lib/guards";
import { eq } from "drizzle-orm";
import { parseScene } from "@/lib/scene";
import { EditorClient } from "@/components/editor/editor-client";

export const metadata = { title: "Editor — Mapping" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");

  const mapRows = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
  const map = mapRows[0];
  if (!map) notFound();

  const collab = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(eq(mapCollaborators.mapId, id), eq(mapCollaborators.userId, user.id))
    .limit(1);
  // Revoked/never-invited users must NOT get a read-only editor: show a denial state.
  const hasAccess = collab.length > 0 || map.ownerId === user.id;
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Anda tidak punya akses ke peta ini.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Minta owner untuk mengundang Anda kembali.
          </p>
        </div>
      </div>
    );
  }
  const role = (collab[0]?.role as "owner" | "editor" | "viewer" | undefined) ?? (map.ownerId === user.id ? "owner" : "viewer");

  const stateRows = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
  const scene = stateRows[0] ? parseScene(stateRows[0].scene) : null;
  const currentRevision = stateRows[0]?.revision ?? 0;

  const nodes = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id));

  return (
    <EditorClient
      mapId={id}
      title={map.title}
      role={role}
      userName={user.name}
      selfUserId={user.id}
      initialScene={scene}
      initialRevision={currentRevision}
      initialNodes={nodes.map((n) => ({ id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd }))}
    />
  );
}
```
> `parseScene` returns `null` on corrupt JSON — the editor then starts blank instead of crashing (a corrupt state row is recovered by the next save). `selfUserId` is used by the presence avatars (Task 14) to hide your own avatar.

- [ ] **Step 4: Create `components/editor/editor-client.tsx` (orchestrator — v1 shell)**

Full save/poll logic is added in Task 12; the real Markdown panel is mounted in Task 11 (it does not exist yet — this step uses a placeholder aside so Task 9 compiles and is independently verifiable).

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CanvasBridge, type CanvasHandle, type SceneSnapshot } from "./canvas-bridge";
import type { ScenePayload } from "@/lib/scene";
import { api, ApiError } from "@/lib/api-client";

export type NodeRow = { id: string; elementId: string; title: string; contentMd: string };

type Props = {
  mapId: string;
  title: string;
  role: "owner" | "editor" | "viewer";
  userName: string;
  selfUserId: string;
  initialScene: ScenePayload | null;
  initialRevision: number;
  initialNodes: NodeRow[];
};

export function EditorClient({
  mapId,
  title,
  role,
  userName,
  selfUserId,
  initialScene,
  initialRevision,
  initialNodes,
}: Props) {
  const handleRef = useRef<CanvasHandle | null>(null);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const canEdit = role !== "viewer";

  const onSceneChange = useCallback((_snap: SceneSnapshot) => {
    // Task 12 wires debounced save here.
  }, []);

  async function addNode() {
    const handle = handleRef.current;
    if (!handle) {
      toast.error("Canvas belum siap");
      return;
    }
    const created = handle.addNodeAtCenter("Node baru");
    if (!created) return;
    try {
      await api.post(`/api/maps/${mapId}/nodes`, {
        id: created.nodeId,
        elementId: created.elementId,
        title: "Node baru",
      });
      setOpenNodeId(created.nodeId);
    } catch (e) {
      handle.removeElement(created.elementId); // roll back the canvas element
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan node");
    }
  }

  const openNode = openNodeId ? initialNodes.find((n) => n.id === openNodeId) : undefined;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <Link href="/maps" className="text-sm text-muted-foreground hover:underline">
          ← Peta
        </Link>
        <h1 className="text-sm font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <Button size="sm" onClick={() => void addNode()} title="Shortcut: N">
              + Node
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{userName}</span>
        </div>
      </header>
      <div className="relative flex-1">
        <CanvasBridge
          initial={initialScene}
          viewMode={!canEdit}
          onSceneChange={onSceneChange}
          onNodeClick={setOpenNodeId}
          onEmptyClick={() => setOpenNodeId(null)}
          handleRef={handleRef}
        />
        {openNodeId && (
          <aside className="absolute bottom-3 right-3 top-3 flex w-80 flex-col rounded-lg border bg-background p-3 shadow-lg sm:w-96">
            <Button size="sm" variant="ghost" className="self-end" onClick={() => setOpenNodeId(null)}>
              ✕
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Node <code>{openNodeId}</code> terbuka. (Panel Markdown penuh dipasang di Task 11.)
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
```
> Task 9 uses a placeholder aside (the Markdown `NodePanel` is created and mounted in Task 11 — importing it here would break compilation). The `openNode` lookup is intentionally omitted in this step.

- [ ] **Step 5: Verify the editor shell in the browser**

Run `npm run dev`, create a map from `/maps`, open it:
- The Excalidraw canvas renders (whiteboard toolbar visible) — NOT blank (if blank: container has zero height, or the CSS import is missing — both are covered above).
- Click "+ Node" → a blue labeled rectangle appears at center → the placeholder aside shows the nodeId. Click the rectangle again → aside stays; click empty canvas → aside closes.
- Click the new rectangle → panel stays open (same nodeId). Click empty canvas → panel closes.
- Refresh: the node rectangle is still there (canvas is persisted in Task 12 — at THIS step the canvas is still unsaved, so a refresh is expected to be blank; only the `map_nodes` row exists. Do not treat a blank canvas here as a bug.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: editor page + CanvasBridge (excalidraw 0.18.1) + node click/create shell"
```

---

### Task 10: "N" keybinding for node creation

**Files:**
- Create: `lib/hooks/use-create-node-keybinding.ts`
- Modify: `components/editor/editor-client.tsx` (wire the keybinding)

- [ ] **Step 1: Create `lib/hooks/use-create-node-keybinding.ts`**

0.18.1 has NO `registerCustomKeybinding` — this is the verified `window`-listener fallback. Plain "N" conflicts with no built-in Excalidraw binding.

```ts
"use client";

import { useEffect } from "react";

/**
 * Fires `onCreate` on a plain "N" keypress, ignoring:
 *  - any modifier key (ctrl/cmd/alt/shift),
 *  - typing contexts (input/textarea/contentEditable).
 */
export function useCreateNodeKeybinding(onCreate: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      }
      e.preventDefault();
      onCreate();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, onCreate]);
}
```

- [ ] **Step 2: Wire it in `editor-client.tsx`**

Add the import (`useCreateNodeKeybinding`) and, inside `EditorClient` after `addNode`:
```tsx
const addNodeCb = useCallback(() => {
  void addNode();
}, []); // handleRef (stable ref) + mapId (stable per page) are safe to capture
useCreateNodeKeybinding(addNodeCb, canEdit && !openNodeId);
```
(`addNode`'s closure uses `handleRef` (stable) and `mapId` (constant per page), so an empty dep array is correct — do not add deps that re-fire the listener on every render.)

- [ ] **Step 3: Verify in browser**

On the editor: press `N` (canvas focused, not typing) → node created + panel opens. Press `N` while the panel is open (focused in an input/textarea) → nothing happens. `Ctrl+N` → nothing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: N keybinding for node creation (window listener, 0.18.1-safe)"
```

---

### Task 11: Nodes API + Markdown node panel

**Files:**
- Create: `app/api/maps/[id]/nodes/route.ts`, `app/api/maps/[id]/nodes/[nodeId]/route.ts`, `components/markdown/markdown-editor.tsx`, `components/markdown/markdown-view.tsx`, `components/editor/node-panel.tsx`, `lib/hooks/use-debounced-callback.ts`
- Modify: `lib/validators.ts` (add `createNodeFullSchema`)

- [ ] **Step 1: Add the node-creation validator (client pre-generates the id)**

Append to `lib/validators.ts`:
```ts
export const createNodeFullSchema = z.object({
  id: z.string().uuid(),
  elementId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300).default("Tanpa judul"),
});
```
> The client generates the node id (`newId()`) so the element id and the node row can be created in one POST; the server only validates.

- [ ] **Step 2: Create `app/api/maps/[id]/nodes/route.ts`**

```ts
import { db } from "@/lib/db";
import { mapNodes } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { createNodeFullSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id));
  return Response.json({
    data: rows.map((n) => ({ id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd, updatedAt: n.updatedAt })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = createNodeFullSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }
  const now = Date.now();
  try {
    await db.insert(mapNodes).values({
      id: parsed.data.id,
      mapId: id,
      elementId: parsed.data.elementId,
      title: parsed.data.title,
      createdAt: now,
      updatedAt: now,
      updatedBy: res.user.id,
    });
  } catch {
    // unique violation on (mapId, elementId)
    return Response.json({ error: "conflict", message: "Node untuk elemen ini sudah ada." }, { status: 409 });
  }
  return Response.json(
    { data: { id: parsed.data.id, elementId: parsed.data.elementId, title: parsed.data.title, contentMd: "", updatedAt: now } },
    { status: 201 },
  );
}
```

- [ ] **Step 3: Create `app/api/maps/[id]/nodes/[nodeId]/route.ts`**

```ts
import { db } from "@/lib/db";
import { mapNodes } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { updateNodeSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; nodeId: string }> };

function findNode(mapId: string, nodeId: string) {
  return db.select().from(mapNodes).where(and(eq(mapNodes.mapId, mapId), eq(mapNodes.id, nodeId))).limit(1);
}

export async function GET(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await findNode(id, nodeId);
  if (rows.length === 0) {
    return Response.json({ error: "not_found", message: "Node tidak ditemukan." }, { status: 404 });
  }
  const n = rows[0];
  return Response.json({ data: { id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd, updatedAt: n.updatedAt } });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapRole(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = updateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }
  const values: Record<string, unknown> = { updatedAt: Date.now(), updatedBy: res.user.id };
  if (parsed.data.title !== undefined) values.title = parsed.data.title;
  if (parsed.data.contentMd !== undefined) values.contentMd = parsed.data.contentMd;
  const rows = await db.update(mapNodes).set(values).where(and(eq(mapNodes.mapId, id), eq(mapNodes.id, nodeId))).returning();
  if (rows.length === 0) {
    return Response.json({ error: "not_found", message: "Node tidak ditemukan." }, { status: 404 });
  }
  const n = rows[0];
  return Response.json({ data: { id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd, updatedAt: n.updatedAt } });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapRole(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  await db.delete(mapNodes).where(and(eq(mapNodes.mapId, id), eq(mapNodes.id, nodeId)));
  return Response.json({ data: { ok: true } });
}
```

- [ ] **Step 4: Create the Markdown editor + view components**

`components/markdown/markdown-editor.tsx`:
```tsx
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      readOnly={readOnly}
      theme="light"
      extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
      onChange={onChange}
    />
  );
}
```
> CodeMirror is controlled via `value`+`onChange`; self-typed text is not re-dispatched (cursor stays put). Only deliberate external overwrites move the cursor.

`components/markdown/markdown-view.tsx`:
```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node: _node, children, ...props }) {
            return (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
```
> react-markdown v10: no `className` prop (wrap in a styled div). Raw HTML is disabled by default — no sanitizer needed. `@tailwindcss/typography` (Task 1) powers the `prose` classes.

- [ ] **Step 5: Create `lib/hooks/use-debounced-callback.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";

/**
 * Fires fn(latestValue) `ms` after the LAST change to `value`.
 * Also fires once `ms` after mount — guard with a `dirty` flag in the caller
 * when you only want to persist AFTER the user actually edited.
 */
export function useDebouncedCallback<T>(value: T, ms: number, fn: (latest: T) => void) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => {
    const timer = setTimeout(() => fnRef.current(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
}
```

- [ ] **Step 6: Create `components/editor/node-panel.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { api, ApiError } from "@/lib/api-client";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type Props = {
  mapId: string;
  nodeId: string;
  canEdit: boolean;
  initial: { title: string; contentMd: string };
  onClose: () => void;
};

export function NodePanel({ mapId, nodeId, canEdit, initial, onClose }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.contentMd);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);

  // Reset local state whenever a different node is opened
  useEffect(() => {
    setTitle(initial.title);
    setContent(initial.contentMd);
    setDirty(false);
  }, [nodeId, initial.title, initial.contentMd]);

  const save = useCallback(
    async (t: string, c: string) => {
      try {
        await api.patch(`/api/maps/${mapId}/nodes/${nodeId}`, { title: t, contentMd: c });
        setDirty(false);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan node");
      }
    },
    [mapId, nodeId],
  );

  useDebouncedCallback(content, 800, (c) => {
    if (canEdit && dirty) void save(title, c);
  });
  useDebouncedCallback(title, 800, (t) => {
    if (canEdit && dirty) void save(t, content);
  });

  async function removeNode() {
    if (!confirm("Hapus node ini? Isinya ikut terhapus dari database.")) return;
    try {
      await api.delete(`/api/maps/${mapId}/nodes/${nodeId}`);
      toast.success("Node dihapus");
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus node");
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          ✕
        </Button>
        <div className="ml-auto flex rounded-md border text-xs">
          <button
            className={`px-2 py-1 ${mode === "write" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("write")}
          >
            Tulis
          </button>
          <button
            className={`px-2 py-1 ${mode === "preview" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("preview")}
          >
            Pratinjau
          </button>
        </div>
      </div>
      <Input
        value={title}
        readOnly={!canEdit}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        aria-label="Judul node"
      />
      <Separator />
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
        {mode === "write" ? (
          <MarkdownEditor
            value={content}
            readOnly={!canEdit}
            onChange={(v) => {
              setContent(v);
              setDirty(true);
            }}
          />
        ) : (
          <div className="h-full overflow-auto p-3">
            <MarkdownView markdown={content} />
          </div>
        )}
      </div>
      {canEdit && (
        <Button size="sm" variant="destructive" className="self-end" onClick={() => void removeNode()}>
          Hapus node
        </Button>
      )}
    </div>
  );
}
```
> **Cursor-safety:** the panel's local state is the source of truth while open; the debounced save only PUSHES to the server (never re-pulls into the editor), so the cursor never jumps while typing. A remote revision arriving at the canvas (Task 12) updates other editors' canvases but NOT this open editor's text — by design.

- [ ] **Step 7: Mount the real panel in `editor-client.tsx` (replace the Task 9 placeholder)**

Replace the placeholder `<aside>` block (the one showing `Node <code>{openNodeId}</code> terbuka…`) with:
```tsx
const openNode = openNodeId ? initialNodes.find((n) => n.id === openNodeId) : undefined;

// ... inside the return, where the placeholder aside was:
{openNodeId && (
  <aside className="absolute bottom-3 right-3 top-3 flex w-80 flex-col rounded-lg border bg-background p-3 shadow-lg sm:w-96">
    {openNode ? (
      <NodePanel
        key={openNodeId}
        mapId={mapId}
        nodeId={openNodeId}
        canEdit={canEdit}
        initial={{ title: openNode.title, contentMd: openNode.contentMd }}
        onClose={() => setOpenNodeId(null)}
      />
    ) : (
      <div className="flex h-full flex-col">
        <Button size="sm" variant="ghost" className="self-end" onClick={() => setOpenNodeId(null)}>
          ✕
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Catatan untuk node ini belum ada di server (tampil setelah refresh — barisnya sudah tersimpan).
        </p>
      </div>
    )}
  </aside>
)}
```
Add `import { NodePanel } from "./node-panel";`. The `key={openNodeId}` remounts the panel per node (clean local state).

- [ ] **Step 8: Verify in browser**

- Add a node → panel opens with empty Markdown. Type `## Riset\n- API mengambil kolom \`users.id\`` → wait ~1s → DevTools Network shows `PATCH /api/maps/<id>/nodes/<nodeId>` with the content.
- Switch to Pratinjau → renders GFM (heading + list).
- Delete the node → confirm → panel closes. Verify the row is gone: `fetch('/api/maps/<id>/nodes', {credentials:'include'}).then(r=>r.json())` in the console returns `[]`.
- Reload the page, re-add a node, wait, then reload again and click the node's rectangle → its saved Markdown is present in the panel (the rectangle itself only survives a reload from Task 12 on — if it's gone now, that is expected; the `map_nodes` row is what you're verifying here).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: nodes API (CRUD) + Markdown node panel (CodeMirror + GFM preview, autosave)"
```

---

### Task 12: State save + poll (ETag, debounce, server-side merge, image guard)

**Files:**
- Create: `app/api/maps/[id]/state/route.ts`
- Modify: `components/editor/editor-client.tsx` (debounced save + 2.5s poll + image guard + status), `lib/api-client.ts` (add `requestWithHeaders`)

- [ ] **Step 1: Add `MAX_BODY_BYTES` to `lib/validators.ts`**

```ts
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
```

- [ ] **Step 2: Create `app/api/maps/[id]/state/route.ts`**

The server is the merge authority: it reconciles the incoming scene with the stored scene (per-element LWW via Excalidraw's own `reconcileElements`) and always returns the authoritative result + new revision.

```ts
import { db } from "@/lib/db";
import { maps, mapState } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { saveStateSchema, MAX_BODY_BYTES } from "@/lib/validators";
import { parseScene, toScenePayload, sceneSizeBytes, mergeScenes, type ScenePayload } from "@/lib/scene";
import { restoreElements } from "@excalidraw/excalidraw";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
  const row = rows[0];
  if (!row) {
    return Response.json({ data: { revision: 0, scene: null } }, { headers: { ETag: '"0"' } });
  }
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === `"${row.revision}"`) {
    return new Response(null, { status: 304 });
  }
  return Response.json({ data: { revision: row.revision, scene: JSON.parse(row.scene) } }, {
    headers: { ETag: `"${row.revision}"` },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "too_large", message: "Scene melebihi 4MB — hapus beberapa gambar lalu coba lagi." },
      { status: 413 },
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = saveStateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }
  const incoming = parsed.data.scene as unknown as ScenePayload;

  const storedRows = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
  const stored = storedRows[0] ? parseScene(storedRows[0].scene) : null;

  let finalScene: ScenePayload;
  if (!stored) {
    finalScene = incoming;
  } else {
    // Server-side merge: stored scene is "local", incoming is "remote" (LWW per element).
    // Use the stored (persisted-safe) appState — NOT an empty object — because
    // reconcileElements reads appState fields (e.g. selectedElementIds).
    const storedOrdered = restoreElements(stored.elements ?? null, null);
    const merged = mergeScenes(
      storedOrdered,
      (stored.appState ?? {}) as never,
      stored.files ?? {},
      incoming,
    );
    finalScene = toScenePayload(merged.elements as never[], (stored.appState ?? {}) as never, merged.files);
  }
  if (sceneSizeBytes(finalScene) > MAX_BODY_BYTES) {
    return Response.json(
      { error: "too_large", message: "Scene gabungan melebihi 4MB — hapus beberapa gambar." },
      { status: 413 },
    );
  }

  const revision = (storedRows[0]?.revision ?? 0) + 1;
  const now = Date.now();
  const json = JSON.stringify(finalScene);
  await db
    .insert(mapState)
    .values({ mapId: id, revision, scene: json, updatedBy: res.user.id, updatedAt: now })
    .onConflictDoUpdate({
      target: mapState.mapId,
      set: { revision, scene: json, updatedBy: res.user.id, updatedAt: now },
    });
  await db.update(maps).set({ updatedAt: now }).where(eq(maps.id, id));

  return Response.json({ data: { revision, scene: finalScene } }, { headers: { ETag: `"${revision}"` } });
}
```
> `restoreElements` and `reconcileElements` (inside `mergeScenes`) are pure functions — they run fine on the Node runtime with no DOM.

- [ ] **Step 3: Add header-aware fetch to `lib/api-client.ts`**

Append (polling needs `If-None-Match` + 304 handling, which the `data`-unwrapping wrapper can't express):
```ts
export type RawResult<T> = { status: number; data: T | null; etag: string | null };

export async function requestWithHeaders<T>(path: string, init?: RequestInit): Promise<RawResult<T>> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (res.status === 304) return { status: 304, data: null, etag: res.headers.get("etag") };
  const etag = res.headers.get("etag");
  if (!res.ok) {
    let message = `Gagal (status ${res.status})`;
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(res.status, "internal", message);
  }
  const json = (await res.json()) as { data: T };
  return { status: res.status, data: json.data, etag };
}
```

- [ ] **Step 4: Wire save + poll into `editor-client.tsx`**

Replace the no-op `onSceneChange` from Task 9 with the full logic below, and add the state/poll. Full new/changed sections of `EditorClient`:

```tsx
import { MAX_IMAGE_BYTES, sceneSizeBytes, toScenePayload, type ScenePayload } from "@/lib/scene";
import { requestWithHeaders } from "@/lib/api-client";

// new state (add near the other useState lines):
const [revision, setRevision] = useState(initialRevision);
const revisionRef = useRef(revision);
revisionRef.current = revision;
const skipSaveRef = useRef(true); // swallow the initial hydration onChange burst
const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");

const doSave = useCallback(
  async (snap: SceneSnapshot) => {
    for (const f of Object.values(snap.files)) {
      const dataURL = (f as { dataURL?: string }).dataURL;
      if (dataURL && dataURL.length > MAX_IMAGE_BYTES) {
        toast.error("Ada gambar melebihi 2MB — kompres terlebih dahulu.", { id: "img-too-big" });
        return;
      }
    }
    const scene = toScenePayload(snap.elements, snap.appState, snap.files);
    if (sceneSizeBytes(scene) > 4 * 1024 * 1024) {
      toast.error("Peta terlalu besar (>4MB). Hapus beberapa gambar untuk menyimpan.", { id: "scene-too-big" });
      return;
    }
    setStatus("saving");
    try {
      const r = await api.post<{ revision: number }>(`/api/maps/${mapId}/state`, {
        scene,
        baseRevision: revisionRef.current,
      });
      setRevision(r.revision);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan — akan menyinkronkan ulang");
      // recover: pull the server's authoritative scene into the canvas
      try {
        const latest = await requestWithHeaders<{ revision: number; scene: ScenePayload | null }>(
          `/api/maps/${mapId}/state`,
        );
        if (latest.data?.scene) {
          skipSaveRef.current = true;
          handleRef.current?.applyRemote(latest.data.scene);
          setRevision(latest.data.revision);
        }
      } catch {
        /* will retry on the next edit */
      }
    }
  },
  [mapId],
);

const onSceneChange = useCallback(
  (snap: SceneSnapshot) => {
    if (!canEdit) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(snap), 700);
  },
  [canEdit, doSave],
);
useEffect(() => () => {
  if (saveTimer.current) clearTimeout(saveTimer.current);
}, []);

// 2.5s poll — ALL roles (viewers also see others' changes)
useEffect(() => {
  const timer = setInterval(async () => {
    try {
      const r = await requestWithHeaders<{ revision: number; scene: ScenePayload | null }>(
        `/api/maps/${mapId}/state`,
        { headers: { "if-none-match": `"${revisionRef.current}"` } },
      );
      if (r.status === 304) return;
      const rev = r.data?.revision ?? 0;
      if (rev > revisionRef.current && r.data?.scene) {
        skipSaveRef.current = true; // applying remote must not trigger a save
        handleRef.current?.applyRemote(r.data.scene);
        setRevision(rev);
      }
    } catch {
      /* transient network error — retry next tick */
    }
  }, 2500);
  return () => clearInterval(timer);
}, [mapId]);
```
And add a status indicator in the header (next to the user name):
```tsx
<span className="text-xs text-muted-foreground">
  {status === "saving" ? "Menyimpan…" : status === "error" ? "Gagal menyimpan" : "Tersimpan"}
</span>
```

- [ ] **Step 5: Verify end-to-end in two browser windows**

1. Window A: open a map, add a node, drag it, type in its panel. Header shows "Menyimpan…" → "Tersimpan".
2. Window B (same map — second account invited in Task 13, or same account in a second window): within ~3s the node + position + canvas edits appear via the poll. In B, `Ctrl+Z` undoes only B's own actions (remote apply used `captureUpdate: NEVER` — verify the remote node is NOT in B's undo stack).
3. Both windows drag DIFFERENT nodes at the same time → after the next save, both survive (LWW per element).
4. Paste a small image (e.g. a 20KB PNG) in A → it appears in B within ~3s (dataURL travels inside the scene).
5. Reload A → canvas restores from Turso (node, position, image).

- [ ] **Step 6: Add an integration test for state save + poll (ETag)**

Append to `tests/integration/api.test.ts`:
```ts
import { GET as getState, POST as postState } from "@/app/api/maps/[id]/state/route";

function sceneWithRects(n: number) {
  return {
    type: "excalidraw",
    version: 2,
    source: "test",
    elements: Array.from({ length: n }, (_, i) => ({
      id: `e${i}`,
      type: "rectangle",
      x: i * 10,
      y: 0,
      width: 10,
      height: 10,
      version: 1,
    })),
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  };
}

describe("state API", () => {
  it("saves (revision 1 + ETag), 304s on poll, and merges on the next save", async () => {
    const cookie = await signUp(`s${Date.now()}@example.com`);
    const created = (await (
      await postMaps(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Sync" }),
        }),
      )
    ).json()) as { data: { id: string } };
    const id = created.data.id;

    const post = await postState(
      new Request(`http://localhost:3000/api/maps/${id}/state`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ scene: sceneWithRects(2), baseRevision: 0 }),
      }),
      ctx(id),
    );
    expect(post.status).toBe(200);
    expect(post.headers.get("etag")).toBe('"1"');
    const postBody = (await post.json()) as { data: { revision: number } };
    expect(postBody.data.revision).toBe(1);

    const poll = await getState(
      new Request(`http://localhost:3000/api/maps/${id}/state`, {
        headers: { cookie, "if-none-match": '"1"' },
      }),
      ctx(id),
    );
    expect(poll.status).toBe(304);

    const post2 = await postState(
      new Request(`http://localhost:3000/api/maps/${id}/state`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ scene: sceneWithRects(3), baseRevision: 1 }),
      }),
      ctx(id),
    );
    const body2 = (await post2.json()) as { data: { revision: number; scene: { elements: unknown[] } } };
    expect(body2.data.revision).toBe(2);
    expect(body2.data.scene.elements.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects oversized scenes with 413", async () => {
    const cookie = await signUp(`big${Date.now()}@example.com`);
    const created = (await (
      await postMaps(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Big" }),
        }),
      )
    ).json()) as { data: { id: string } };
    const huge = sceneWithRects(2);
    huge.files = { big: { id: "big", mimeType: "image/png", dataURL: "data:image/png;base64," + "A".repeat(5 * 1024 * 1024), created: 1 } };
    const res = await postState(
      new Request(`http://localhost:3000/api/maps/${created.data.id}/state`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ scene: huge, baseRevision: 0 }),
      }),
      ctx(created.data.id),
    );
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 7: Run all tests — verify pass**

Run:
```bash
npm run test
```
Expected: unit (scene, validators) + integration (auth, maps, state) all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: state save+poll (ETag, 700ms debounce, 2.5s poll, server-side LWW merge, size guard) + tests"
```

---

## PHASE 3 — COLLABORATION (share + presence) + EXPORT

### Task 13: Collaborators API + Share dialog

**Files:**
- Create: `app/api/maps/[id]/collaborators/route.ts`, `app/api/maps/[id]/collaborators/[userId]/route.ts`, `components/maps/share-dialog.tsx`
- Modify: `components/editor/editor-client.tsx` (mount Share dialog in topbar)

- [ ] **Step 1: Create `app/api/maps/[id]/collaborators/route.ts` (list + invite)**

```ts
import { db } from "@/lib/db";
import { mapCollaborators, user } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { inviteSchema } from "@/lib/validators";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await db
    .select({ userId: mapCollaborators.userId, role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(eq(mapCollaborators.mapId, id));
  if (rows.length === 0) return Response.json({ data: [] });
  const users = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.id, rows.map((r) => r.userId)));
  const byId = new Map(users.map((u) => [u.id, u]));
  return Response.json({
    data: rows.map((r) => ({
      userId: r.userId,
      name: byId.get(r.userId)?.name ?? "Unknown",
      email: byId.get(r.userId)?.email ?? "",
      role: r.role as "owner" | "editor" | "viewer",
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();
  const targets = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (targets.length === 0) {
    return Response.json(
      { error: "conflict", message: "Email belum terdaftar. Minta dia membuat akun dulu." },
      { status: 409 },
    );
  }
  const target = targets[0];
  const existing = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(eq(mapCollaborators.mapId, id), eq(mapCollaborators.userId, target.id))
    .limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "conflict", message: "User sudah jadi kolaborator." }, { status: 409 });
  }
  await db.insert(mapCollaborators).values({
    mapId: id,
    userId: target.id,
    role: parsed.data.role,
    createdAt: Date.now(),
  });
  return Response.json(
    { data: { userId: target.id, email, role: parsed.data.role } },
    { status: 201 },
  );
}
```
> v1 constraint (per spec): invites only work for already-registered emails. No invitation email is sent — the owner tells the person to open the map (they will now see it in `/maps` because the list query includes shared maps).

- [ ] **Step 2: Create `app/api/maps/[id]/collaborators/[userId]/route.ts` (remove)**

```ts
import { db } from "@/lib/db";
import { mapCollaborators } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  if (userId === res.user.id) {
    return Response.json(
      { error: "conflict", message: "Anda tidak bisa menghapus diri sendiri sebagai owner." },
      { status: 409 },
    );
  }
  await db
    .delete(mapCollaborators)
    .where(and(eq(mapCollaborators.mapId, id), eq(mapCollaborators.userId, userId)));
  return Response.json({ data: { ok: true } });
}
```

- [ ] **Step 3: Create `components/maps/share-dialog.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

type Collab = { userId: string; name: string; email: string; role: "owner" | "editor" | "viewer" };

export function ShareDialog({ mapId }: { mapId: string }) {
  const [open, setOpen] = useState(false);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCollabs(await api.get<Collab[]>(`/api/maps/${mapId}/collaborators`));
    } catch {
      /* non-owner or transient */
    }
  }, [mapId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/maps/${mapId}/collaborators`, { email: email.trim(), role });
      toast.success("Kolaborator ditambahkan");
      setEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menambah kolaborator");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    try {
      await api.delete(`/api/maps/${mapId}/collaborators/${userId}`);
      toast.success("Kolaborator dihapus");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Bagikan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bagikan peta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                type="email"
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                aria-label="Peran"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button size="sm" className="w-full" onClick={() => void invite()} disabled={busy || !email.trim()}>
              {busy ? "..." : "Undang"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Kolaborator</Label>
            {collabs.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kolaborator.</p>}
            {collabs.map((c) => (
              <div key={c.userId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-muted-foreground">({c.email})</span>
                  <Badge variant="secondary" className="ml-2">
                    {c.role}
                  </Badge>
                </div>
                {c.role !== "owner" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(c.userId)}>
                    Hapus
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Mount the Share dialog in the editor topbar**

In `editor-client.tsx`, add `import { ShareDialog } from "@/components/maps/share-dialog";` and, inside the header's `ml-auto` div (before the user name), render it only for owners:
```tsx
{role === "owner" && <ShareDialog mapId={mapId} />}
```

- [ ] **Step 5: Verify in browser (two accounts)**

1. Account A creates a map, opens it, clicks "Bagikan", invites account B's email as **Editor** → B appears in the list.
2. Account B (logged in elsewhere) opens `/maps` → the shared map appears with badge "Editor". Opens it → can add nodes & edit Markdown.
3. B tries "Bagikan" → not visible (non-owner). A revokes B → B's next visit to the map URL shows the friendly "Anda tidak punya akses ke peta ini." state. (That denial state was added to `app/maps/[id]/page.tsx` in Task 9 Step 3 — verify it triggers; do NOT re-add it here.)
> The access gate lives in BOTH the editor page (Task 9 Step 3) and the API (`requireMapRole`, already enforced server-side). Revoking a collaborator removes their `map_collaborators` row, so the page-level `hasAccess` check and every API call both deny them.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: collaborators API (list/invite/revoke) + share dialog + access-denied state"
```

---

### Task 14: Presence API + avatars

**Files:**
- Create: `app/api/maps/[id]/presence/route.ts`, `components/editor/presence-avatars.tsx`
- Modify: `components/editor/editor-client.tsx` (heartbeat + avatars)

- [ ] **Step 1: Create `app/api/maps/[id]/presence/route.ts`**

```ts
import { db } from "@/lib/db";
import { presence, user } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

const STALE_MS = 30_000;

async function activeRows(mapId: string) {
  const rows = await db
    .select({ userId: presence.userId, lastSeen: presence.lastSeen })
    .from(presence)
    .where(eq(presence.mapId, mapId));
  const now = Date.now();
  const active = rows.filter((r) => now - r.lastSeen < STALE_MS);
  if (active.length === 0) return [];
  const users = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, active.map((r) => r.userId)));
  const byId = new Map(users.map((u) => [u.id, u]));
  return active.map((r) => ({
    userId: r.userId,
    name: byId.get(r.userId)?.name ?? "?",
    lastSeen: r.lastSeen,
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  return Response.json({ data: await activeRows(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  await db
    .insert(presence)
    .values({ mapId: id, userId: res.user.id, lastSeen: Date.now() })
    .onConflictDoUpdate({
      target: [presence.mapId, presence.userId],
      set: { lastSeen: Date.now() },
    });
  return Response.json({ data: await activeRows(id) });
}
```
> The 30s staleness filter runs in JS (`activeRows`) — no need for it in SQL.

- [ ] **Step 2: Create `components/editor/presence-avatars.tsx`**

```tsx
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function PresenceAvatars({
  people,
  selfId,
}: {
  people: Array<{ userId: string; name: string }>;
  selfId: string;
}) {
  const others = people.filter((p) => p.userId !== selfId);
  if (others.length === 0) return null;
  return (
    <div className="flex -space-x-2" aria-label={`${others.length} orang lain sedang di peta ini`}>
      {others.slice(0, 4).map((p) => (
        <Avatar key={p.userId} className="h-6 w-6 border-2 border-background">
          <AvatarFallback className="text-[10px]">
            {p.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {others.length > 4 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
          +{others.length - 4}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire heartbeat + avatars in `editor-client.tsx`**

```tsx
import { PresenceAvatars } from "./presence-avatars";

// state:
const [people, setPeople] = useState<Array<{ userId: string; name: string }>>([]);

// heartbeat every 10s (all roles) + immediate on mount:
useEffect(() => {
  const tick = async () => {
    try {
      const data = await api.post<Array<{ userId: string; name: string }>>(
        `/api/maps/${mapId}/presence`,
        {},
      );
      setPeople(data);
    } catch {
      /* ignore */
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), 10_000);
  return () => clearInterval(timer);
}, [mapId]);
```
In the header (before the Share dialog), render:
```tsx
<PresenceAvatars people={people} selfId={selfUserId} />
```
and pass `selfUserId` down from `app/maps/[id]/page.tsx` as a new prop (`user.id`) → add to `EditorClient` props: `selfUserId: string`.

- [ ] **Step 4: Verify in browser**

Two accounts on the same map: account B's avatar (initials) appears in A's topbar within ~10s. Close B's tab → avatar disappears after ~30s (staleness). No avatar for yourself.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: presence (heartbeat + active users) + avatars in editor topbar"
```

---

### Task 15: Export PNG / JSON

**Files:**
- Modify: `components/editor/editor-client.tsx` (Export dropdown)

- [ ] **Step 1: Add an Export dropdown to the editor topbar**

In `editor-client.tsx`, add imports (`DropdownMenu` family from `@/components/ui/dropdown-menu`, `MIME_TYPES` from Excalidraw is NOT needed here — the bridge already returns Blob/string) and a small helper:
```tsx
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "peta";

async function exportPng() {
  const handle = handleRef.current;
  if (!handle) return;
  try {
    const blob = await handle.exportPng();
    triggerDownload(blob, `${safeName}.png`);
  } catch {
    toast.error("Gagal ekspor PNG");
  }
}
function exportJson() {
  const handle = handleRef.current;
  if (!handle) return;
  const json = handle.exportJson();
  if (!json) return;
  triggerDownload(new Blob([json], { type: "application/json" }), `${safeName}.json`);
}
```
In the header `ml-auto` div (before the user name):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="outline">
      Ekspor
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => void exportPng()}>Gambar (PNG)</DropdownMenuItem>
    <DropdownMenuItem onClick={exportJson}>Data (JSON)</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 2: Verify in browser**

Click Ekspor → PNG → a PNG of the whole scene downloads (includes images, since `exportToBlob` receives `api.getFiles()`). Ekspor → JSON → the file parses as JSON with `type: "excalidraw"`, `version: 2`, and the elements.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: export scene as PNG and JSON (client-side)"
```

---

## PHASE 4 — TESTING

### Task 16: Integration test — nodes + roles (authorization matrix)

The maps/state/auth integration tests were added in Tasks 3/6/12. This task adds the node CRUD + role enforcement tests so the whole API surface is covered before e2e.

**Files:**
- Test: `tests/integration/api.test.ts` (append)

- [ ] **Step 1: Append the nodes + roles tests**

```ts
import { POST as postNodes, GET as getNodes } from "@/app/api/maps/[id]/nodes/route";
import { GET as getNode, PATCH as patchNode, DELETE as deleteNode } from "@/app/api/maps/[id]/nodes/[nodeId]/route";

describe("nodes API + role enforcement", () => {
  async function makeMap(ownerEmail: string) {
    const cookie = await signUp(ownerEmail);
    const created = (await (
      await postMaps(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Roles" }),
        }),
      )
    ).json()) as { data: { id: string } };
    return { cookie, mapId: created.data.id };
  }

  it("owner creates, reads, patches, deletes a node", async () => {
    const { cookie, mapId } = await makeMap(`n1${Date.now()}@example.com`);
    const nodeId = crypto.randomUUID();

    const created = await postNodes(
      new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ id: nodeId, elementId: "el-1", title: "Riset" }),
      }),
      ctx(mapId),
    );
    expect(created.status).toBe(201);

    const list = await getNodes(new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, { headers: { cookie } }), ctx(mapId));
    expect((await list.json()).data.length).toBe(1);

    const patched = await patchNode(
      new Request(`http://localhost:3000/api/maps/${mapId}/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ contentMd: "# Halo" }),
      }),
      { params: Promise.resolve({ id: mapId, nodeId }) },
    );
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { data: { contentMd: string } }).data.contentMd).toBe("# Halo");

    const deleted = await deleteNode(
      new Request(`http://localhost:3000/api/maps/${mapId}/nodes/${nodeId}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id: mapId, nodeId }) },
    );
    expect(deleted.status).toBe(200);
    const list2 = await getNodes(new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, { headers: { cookie } }), ctx(mapId));
    expect((await list2.json()).data.length).toBe(0);
  });

  it("viewer can read but not write nodes", async () => {
    const { mapId } = await makeMap(`n2${Date.now()}@example.com`);
    const viewerEmail = `viewer${Date.now()}@example.com`;
    // sign the viewer up, then make them a viewer collaborator directly in the DB
    const { db } = await import("@/lib/db");
    const { mapCollaborators } = await import("@/lib/schema");
    const viewer = await auth.api.signUpEmail({
      body: { name: "Viewer", email: viewerEmail, password: "Password123!" },
    });
    await db.insert(mapCollaborators).values({
      mapId,
      userId: viewer.user.id,
      role: "viewer",
      createdAt: Date.now(),
    });
    // realistic session cookie for the viewer (1.7.2: asResponse + first Set-Cookie segment)
    const vSignIn = await auth.api.signInEmail({
      body: { email: viewerEmail, password: "Password123!" },
      asResponse: true,
    });
    const vCookie = vSignIn.headers.get("set-cookie")!.split(";")[0];

    const nodeId = crypto.randomUUID();
    const readOk = await getNodes(
      new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, { headers: { cookie: vCookie } }),
      ctx(mapId),
    );
    expect(readOk.status).toBe(200);

    const writeDenied = await postNodes(
      new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: vCookie },
        body: JSON.stringify({ id: nodeId, elementId: "el-x", title: "nope" }),
      }),
      ctx(mapId),
    );
    expect(writeDenied.status).toBe(403);
  });

  it("stranger gets 404/403 on a private map (map not found for them)", async () => {
    const { mapId } = await makeMap(`n3${Date.now()}@example.com`);
    const strangerCookie = await signUp(`s2${Date.now()}@example.com`);
    const res = await getMap(
      new Request(`http://localhost:3000/api/maps/${mapId}`, { headers: { cookie: strangerCookie } }),
      ctx(mapId),
    );
    // requireMapRole: map exists but no collaborator row → forbidden (403)
    expect(res.status).toBe(403);
  });
});
```
> **Note:** the viewer test signs the viewer in via `auth.api.signInEmail({ asResponse: true })` to get a real session cookie — this is the verified 1.7.2 pattern (cookie = first `;`-segment of Set-Cookie, i.e. `token.signature`).

- [ ] **Step 2: Run the full suite — verify all green**

Run:
```bash
npm run test
```
Expected: ALL tests pass (scene, validators, auth, maps, state, nodes+roles).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: nodes CRUD + role enforcement (viewer read-only, stranger denied)"
```

---

### Task 17: E2E (Playwright) — register → map → node → markdown → second user sees it

**Files:**
- Create: `playwright.config.ts`, `e2e/flow.spec.ts`
- Modify: `package.json` (scripts already added in Task 1)

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "file:./e2e.db",
      DATABASE_AUTH_TOKEN: "",
      AUTH_SECRET: "e2e-only-secret-not-the-real-one",
      NEXT_PUBLIC_APP_URL: "http://localhost:3100",
    },
  },
});
```
> e2e uses a dedicated local libSQL file (`e2e.db`) — isolated from the dev `local.db`. Migrations must be applied to `e2e.db` before the server starts; do that in a global setup (Step 2). `workers: 1` avoids two users racing the same in-process DB.

- [ ] **Step 2: Create `e2e/global-setup.ts` (migrate e2e.db) + wire it**

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";

export default async function globalSetup() {
  const client = createClient({ url: "file:./e2e.db" });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await client.close();
}
```
Add to `playwright.config.ts`:
```ts
globalSetup: "./e2e/global-setup.ts",
```
Also delete any stale `e2e.db` at the start of the setup (append at the top of `globalSetup`):
```ts
import { rmSync } from "node:fs";
rmSync("./e2e.db", { force: true });
```

- [ ] **Step 3: Create `e2e/flow.spec.ts`**

```ts
import { test, expect, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, email: string, name: string) {
  await page.goto("/register");
  await page.getByLabel("Nama").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill("Password123!");
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL(/\/maps/);
}

async function createMap(page: Page, title: string) {
  await page.getByRole("button", { name: "Peta baru" }).click();
  await page.getByLabel("Judul").fill(title);
  await page.getByRole("button", { name: "Buat" }).click();
  await page.waitForURL(/\/maps\/.+/, { timeout: 15_000 });
}

test.describe("collaborative mind map flow", () => {
  test("owner builds a map with a Markdown node; an invited editor sees it", async ({
    browser,
  }) => {
    const ownerEmail = `e2e-owner-${Date.now()}@example.com`;
    const editorEmail = `e2e-editor-${Date.now()}@example.com`;

    // --- Owner: register, create map, add node, write markdown ---
    const ownerCtx = await browser.newContext();
    const owner = await ownerCtx.newPage();
    await registerAndLogin(owner, ownerEmail, "Owner E2E");
    await createMap(owner, "E2E Map");
    const mapUrl = owner.url(); // http://localhost:3100/maps/<id>

    await owner.getByRole("button", { name: "+ Node" }).click();
    // panel opens; write markdown
    await owner.locator(".cm-content").first().click();
    await owner.keyboard.type("# Riset E2E\n- baris satu");
    await owner.waitForTimeout(1500); // let the 800ms autosave + a save tick land
    // close the panel (click empty canvas area far from the node)
    const canvas = owner.locator("canvas").first();
    const box = (await canvas.boundingBox())!;
    await owner.mouse.click(box.x + 20, box.y + 20);

    // --- Owner invites the editor ---
    await owner.getByRole("button", { name: "Bagikan" }).click();
    await owner.getByPlaceholder("nama@email.com").fill(editorEmail);
    await owner.locator("select").first().selectOption("editor");
    await owner.getByRole("button", { name: "Undang" }).click();
    await expect(owner.getByText("Editor").first()).toBeVisible();

    // --- Editor: register, open the shared map, verify node + markdown ---
    const editorCtx = await browser.newContext();
    const editor = await editorCtx.newPage();
    await registerAndLogin(editor, editorEmail, "Editor E2E");
    // the shared map should now be listed
    await expect(editor.getByRole("link", { name: /E2E Map/ }).first()).toBeVisible();
    await editor.getByRole("link", { name: /E2E Map/ }).first().click();
    await editor.waitForURL(mapUrl);

    // the node's rectangle is on the canvas; open it by clicking the center
    const eCanvas = editor.locator("canvas").first();
    const eBox = (await eCanvas.boundingBox())!;
    await editor.mouse.click(eBox.x + eBox.width / 2, eBox.y + eBox.height / 2);
    // panel should show the saved markdown in preview or write mode
    await expect(editor.getByText("Riset E2E").first()).toBeVisible({ timeout: 8_000 });
  });
});
```
> **Fragile-point guidance for the executor:** canvas center-click assumes the node was created at the viewport center (Task 9's `addNodeAtCenter` does exactly that). If the node's bound text is what's hit rather than the rectangle, the panel still opens (both carry/ reference `customData.nodeId` via the container). If `getByLabel("Nama")` collides (the word "Nama" also appears in the map-title dialog), scope the locator to the register form. Prefer `data-testid` if you add them. Run `npx playwright test --ui` to debug interactively.

- [ ] **Step 4: Run e2e**

Run:
```bash
npm run test:e2e
```
Expected: 1 test passes (owner builds + editor sees). First run downloads Chromium (~170MB) if not cached.

- [ ] **Step 5: Clean up e2e.db artifact**

`e2e.db` is already in `.gitignore` (Task 1). Verify `git status` is clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: e2e (register -> map -> node -> markdown -> invited editor sees it)"
```

---

## PHASE 5 — DEPLOY

### Task 18: Deploy to Vercel + Turso (with CI migration)

**Files:**
- Create: `.github/workflows/ci.yml`, `vercel.json`
- Modify: `.env.example` (Turso values)

- [ ] **Step 1: Create a Turso production database**

1. Install the Turso CLI: `npm i -g @turso/lin` (or `@turso/cli`).
2. Authenticate: `turso auth login` (interactive — the user runs this).
3. Create the DB in the region closest to Indonesia:
```bash
turso db create mapping-prod --location aws-ap-northeast-1   # Tokyo (nearest documented region)
turso db show mapping-prod
```
Copy the **URL** (`libsql://mapping-prod.<...>.turso.io`) and generate a token:
```bash
turso db tokens create mapping-prod
```
> Verify region availability with `turso db locations` — if a closer region is now offered for your org, prefer it. Store URL + token; they go in Vercel env (never in the repo).

- [ ] **Step 2: Apply the schema to production Turso**

```bash
DATABASE_URL=libsql://mapping-prod.<...>.turso.io \
DATABASE_AUTH_TOKEN=<token> \
npm run db:migrate
```
Expected: `✓ migrations applied successfully` against the remote DB.

- [ ] **Step 3: Create `.github/workflows/ci.yml` (test + migrate + build)**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test
      - run: npm run build

  migrate:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          DATABASE_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```
> Migrations run in CI (idempotent — `__drizzle_migrations` tracks applied ones) and BEFORE Vercel deploys (Vercel's build runs after `main` is pushed; the `migrate` job gates on `test`). Add `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` to the repo's GitHub **secrets**.

- [ ] **Step 4: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```
(Kept minimal — Next.js deploys automatically; this file documents the framework and is a no-op otherwise.)

- [ ] **Step 5: Set Vercel environment variables**

In the Vercel dashboard (or `vercel env add`), set for **Production + Preview + Development**:
```
DATABASE_URL=libsql://mapping-prod.<...>.turso.io
DATABASE_AUTH_TOKEN=<token>
AUTH_SECRET=<a NEW 64-hex secret — run: npx auth secret>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app   (production)
RESEND_API_KEY=            (optional; leave empty to keep reset-email disabled)
```
> Use a DIFFERENT `AUTH_SECRET` than local dev — it signs the session cookie and must not be shared across environments.

- [ ] **Step 6: Deploy**

```bash
npm i -g vercel
vercel --prod
```
Expected: build succeeds, the production URL is live. Open it → landing page.

- [ ] **Step 7: Smoke-test production**

1. Register a new account on the production URL.
2. Create a map, add a node, write Markdown.
3. Open the map in a second incognito window (login as a second account the first invited) → verify the node appears within ~3s.
4. Reload → canvas + node + markdown persist (Turso).
5. Check Vercel **Logs**: no 500s; libsql queries resolve; no `FUNCTION_PAYLOAD_TOO_LARGE` (413) under normal use.
6. Check the **Turso dashboard**: `maps`, `map_nodes`, `map_state`, `presence` tables have rows; usage well under the free-tier quota.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: CI (test+build+migrate), vercel.json, deployment smoke checklist"
```

---

## DONE — verification summary

After Task 18, the app is complete and deployed. Confirm against the spec:

| Requirement | Where it's covered |
|---|---|
| Landing page (premium, not generic) | Task 5 |
| Login / register / reset (email+password) | Tasks 3, 4 |
| Dashboard of maps (create/rename/archive/delete) | Task 7 |
| Excalidraw-style infinite canvas | Task 9 |
| Clickable node → Markdown detail panel | Tasks 9, 11 |
| Node creation (+ `N` shortcut) | Tasks 9, 10 |
| Collaboration (2–3s, polling, LWW merge) | Task 12 |
| Sharing (invite by email, roles, revoke) | Task 13 |
| Presence avatars | Task 14 |
| Export PNG/JSON | Task 15 |
| Images (inline dataURL, 2MB/image + 4MB/scene guard) | Task 12 |
| Turso as single source of truth | Tasks 2, 18 |
| Vercel-only deployment + CI migration | Task 18 |
| Tests (unit + integration + e2e) | Tasks 8, 3, 6, 12, 16, 17 |

**Phase-2 upgrade path (documented, NOT built):** real-time via Yjs+Hocuspocus (the data model + REST API stay unchanged — only the transport between `POST /state` and the poll swaps to a WebSocket provider); BLOB-backed images via the `map_files` table to lift the 4MB scene cap; invites to unregistered users; version history/restore.
