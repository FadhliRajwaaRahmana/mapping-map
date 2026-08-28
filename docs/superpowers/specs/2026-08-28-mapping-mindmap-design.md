# Design: Website Mind Map Kolaboratif (Vercel + Turso)

**Tanggal:** 2026-08-28
**Status:** Disetujui user (approach A + modifikasi Vercel-saja)
**Lokasi project:** `C:\Users\Developer\mapping-map` (proyek baru)

## Ringkasan

Website mind map interaktif Excalidraw-style: user register/login, membuat banyak peta di dashboard, dan mengedit peta sebagai infinite canvas bebas (Excalidraw). Setiap **node bisa diklik** untuk membuka **panel detail berisi Markdown**. Peta bersifat **kolaboratif**: beberapa user dengan akses yang sama melihat perubahan editor lain dalam jeda 2–3 detik (polling). Seluruh data di **Turso (libSQL)** sebagai single source of truth, deployed **hanya di Vercel** (Next.js). Biaya operasional awal: $0/bln.

## Keputusan Kunci & Rationale

| # | Keputusan | Rationale (didasari riset terverifikasi 2026-08-28) |
|---|-----------|------------------------------------------------------|
| 1 | **Excalidraw 0.18.1** sebagai canvas | MIT, peer React 19 resmi, primitives publik lengkap (`onChange`, `onPointerUp`, `updateScene({captureUpdate})`, `reconcileElements`, `customData`). Alternatif tldraw 5.3.2 BUKAN MIT (lisensi produksi ~$6k/th) + sync-nya proprietary & store-nya tak bisa Turso → ditolak. |
| 2 | **Vercel-saja, sync via polling** (bukan WebSocket) | Vercel WebSocket = public beta (2026-06-22): koneksi ter-pin 1 instance, dibunuh paksa di maxDuration (300s Hobby; 800s Pro) dengan close 1006 tanpa Close frame, tanpa cross-instance broadcast. Tidak cocok jadi hub room. User memilih kesederhanaan + $0 vs hub Fly.io $5/bln. Trade-off diterima: konkurensi elemen yang sama = last-write-wins; elemen berbeda aman (LWW per elemen via `reconcileElements`). |
| 3 | **Turso sebagai SSOT** | Pilihan user. Semua state (auth, metadata, scene JSON, Markdown, file) di Turso. Tidak ada state server yang hilang saat function mati. |
| 4 | **better-auth 1.7.2** (email+password, DB sessions) | Standar de-facto 2025–2026; Auth.js maintenance-mode (timnya diambil alih Better Auth), Lucia deprecated. Turso first-class via Drizzle adapter. Rate-limit default DB-backed (wajib di Vercel). DB sessions memberi revocation. |
| 5 | **Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 + @libsql/client 0.17.4** | `@drizzle-team/turbo` sudah HILANG dari npm (404) → drizzle-kit `generate`+`migrate` adalah cara resmi (docs Turso & Drizzle). 1.0 masih RC (breaking) → pin 0.x stabil. 1 pipeline migration untuk semua tabel (termasuk tabel better-auth). |
| 6 | **Markdown dipisah dari scene** (tabel `map_nodes`) | Panel Markdown tersimpan via REST tanpa tabrakan dengan polling scene; mudah dicari/diexport. Scene JSON hanya berisi elemen kanvas. |
| 7 | **Yjs TIDAK dipakai di v1** | Polling sudah cukup (keputusan #2). Yjs/Hocuspocus = upgrade path fase 2; struktur data & API tidak berubah. |

## Arsitektur

```
┌────────────────────────────────────────────────────────────┐
│  VERCEL — Next.js 16 App Router (satu-satunya deploy)      │
│                                                            │
│  GET /             Landing page                            │
│  GET /login /register /reset-password                      │
│  GET /maps         Dashboard: daftar peta                  │
│  GET /maps/[id]    EDITOR (Excalidraw + panel Markdown)    │
│                                                            │
│  API Routes (Node.js runtime):                             │
│  /api/auth/*           better-auth (register/login/dll)    │
│  /api/maps             CRUD peta + kolaborator             │
│  /api/maps/[id]/state  GET (polling, ETag=revision)        │
│                      POST (simpan scene, merge server)     │
│  /api/maps/[id]/nodes  CRUD isi Markdown per node          │
│  /api/maps/[id]/files  upload/get gambar (BLOB)            │
│  /api/maps/[id]/presence  heartbeat presence               │
└──────────────────────────┬─────────────────────────────────┘
                           ▼  @libsql/client (HTTP transport)
              ┌─────────────────────────────┐
              │  TURSO (region terdekat ID  │
              │  = Tokyo, verifikasikan)    │
              │  SSOT: semua data di sini   │
              └─────────────────────────────┘
```

### Mekanisme kolaborasi (polling)

1. Browser edit → **debounce ~700ms** → `POST /api/maps/[id]/state` dengan scene JSON + `baseRevision`.
2. Server memvalidasi role (editor/owner), **merge dengan state terakhir di Turso** memakai `reconcileElements(local, remote, appState)` + `getSceneVersion` (LWW per elemen — model yang sama dengan excalidraw.com), menaikkan `revision`, menyimpan.
3. Editor lain **polling `GET` tiap 2,5 detik** dengan header `If-None-Match: <revision>` → `304` (hemat) atau `200` + scene baru → di-apply `updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER })` (remote change tidak masuk undo/redo lokal).
4. Hasil: perubahan orang lain tampil dalam ~2–3 detik.

### Integrasi Excalidraw (bentuk konkret)

- Wrapper component `"use client"`, dimuat `next/dynamic` dengan `ssr: false`, container tinggi non-zero, `import '@excalidraw/excalidraw/index.css'` sekali secara global. (Pitfall React 19 + Next #9320: CSS import & urutan + use client boundary.)
- **Node = elemen Excalidraw** (rectangle/ellipse) + `customData: { nodeId, title }` → `map_nodes.id` / `title`.
- **Klik node → panel**: `onPointerUp` → baca `pointerDownState.hit.element` → jika `element.customData.nodeId` ada → buka panel Markdown node tersebut. (Cadangan: `element.link` + `onLinkOpen`.)
- **Buat node**: `convertToExcalidrawElements` + `updateScene` (shortcut `N` + tombol toolbar).
- **Viewer role**: `viewModeEnabled` (read-only).
- Semua pemanggilan API Excalidraw di-isolasi di satu modul tipis (`lib/excalidraw-bridge.ts`) agar migrasi 0.19 (breaking renames: `scrollToContent`→`setViewport`, `excalidrawAPI`→`onExcalidrawAPI`) menjadi perubahan lokal satu file.

## Data Model (Turso + Drizzle)

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `user` | id, name, email, emailVerified, image, createdAt, updatedAt | Skema resmi better-auth (digenerate CLI, digabung ke schema Drizzle) |
| `session` | id, expiresAt, token, ipAddress, userAgent, userId, createdAt… | DB sessions (cookie httpOnly, sliding 7 hari) |
| `account` | (skema better-auth, dipakai walau tanpa OAuth) | |
| `verification` | id, identifier, value, expiresAt, token, createdAt | Untuk verifikasi email (fase 2) |
| `maps` | id, ownerId, title, description, isArchived, createdAt, updatedAt | |
| `map_collaborators` | mapId, userId, role (`owner`/`editor`/`viewer`) | PK (mapId, userId). Invite by email (harus sudah terdaftar di v1) |
| `map_state` | mapId PK, revision INT, scene (JSON: elements+appState), updatedBy, updatedAt | Seluruh kanvas sebagai JSON |
| `map_nodes` | id, mapId, elementId, title, contentMd, updatedBy, updatedAt | Isi **Markdown** per node; elementId = id elemen Excalidraw |
| `map_files` | id, mapId, fileId, filename, mime, data BLOB, createdAt | Gambar embed; cap 2MB/file |
| `presence` | mapId, userId, lastSeen | Heartbeat tiap 10 dtk; >30 dtk dibuang (cleanup di server saat polling) |

### Batasan ukuran (hard limit Vercel 4.5MB body)

- Scene JSON dikirim **mentah (bukan base64)**, cap desain ~4MB → validasi server tolak >4MB dengan pesan jelas.
- Gambar: max 2MB per file (validasi server, error 413 dengan pesan jelas bila melebihi), **max 20 file per peta** (enforced server-side di `POST /files`).
- `map_nodes.contentMd` tanpa batas praktis (SQLite BLOB/TEXT ~1GB teoritis, turso total 5GB free tier).

## Halaman & UX

- **Landing (`/`)**: premium & modern (bukan template generik), hero + visual demo kanvas interaktif, fitur, CTA, dark/light. Animasi via Framer Motion. Mobile-first.
- **Auth**: register, login, reset-password. Validasi zod, error inline. **MVP berjalan tanpa wajib verifikasi email.** Link "lupa password" di halaman login & alur reset **disembunyikan** selama env `RESEND_API_KEY` belum diset (endpoint-nya tetap ada; bila dipanggil tanpa Resend → pesan error ramah). Setelah Resend disiapkan: verifikasi email + reset password aktif tanpa perubahan skema (tabel `verification` sudah ada).
- **Dashboard (`/maps`)**: grid kartu (peta saya + yang di-invite), buat/rename/duplicate/archive/delete, thumbnail preview.
- **Editor (`/maps/[id]`)**:
  - Top bar: judul inline-edit, avatar kolaborator aktif (presence), Share (invite by email + role), Export (JSON/PNG).
  - Kanvas Excalidraw + toolbar kustom: tombol "+ Node", shortcut `N`.
  - **Klik node → panel kanan** (bottom sheet di mobile): judul + editor Markdown (mode write/preview, autosave ke `map_nodes`), tombol hapus node.
  - Paste/drag gambar ke kanvas → `map_files`.
  - Viewer: read-only.
- **Aksesibilitas dasar**: label form, focus ring, kontras, navigasi keyboard untuk UI chrome (canvas Excalidraw sudah aksesibel).

## Keamanan & Error Handling

- **AuthZ server-side di semua route map**: resolve role dari `map_collaborators` (owner = `ownerId`); viewer hanya GET, editor GET+POST state/nodes/files, owner + kelola collaborators & hapus. Tidak percaya ke UI.
- **Validasi**: zod untuk semua input (body, query, param); format error JSON konsisten `{ error, message }`.
- **Rate limiting**: bawaan better-auth (aktif di production, DB-backed: sign-in/sign-up 3/10dtk, reset 3/60dtk). Guard tambahan ringan untuk POST state (cap ukuran).
- **Upload**: validasi MIME (png/jpg/webp) + ukuran server-side; akses file hanya via route terautentikasi dengan cek role (bukan URL publik statis).
- **Quota Turso**: error `BLOCKED` saat free tier penuh → pesan ramah + hint upgrade.
- **Merge konkurensi**: LWW per elemen; `baseRevision` di-cek — jika gap besar, server tetap merge (idempotent) dan mengembalikan scene final; client selalu mengadopsi scene server setelah POST.
- **Migrations**: `drizzle-kit generate` + `migrate` di CI saat deploy (idempotent, dijaga `__drizzle_migrations`); tidak pernah di runtime request.

## Testing

- **vitest** (unit): logika merge scene (wrapper `reconcileElements` + `getSceneVersion`), alur revision/ETag, guard role, skema zod.
- **Integration API** (libSQL in-memory lokal): register → buat peta → simpan scene → poll dapat 304 lalu 200 setelah update → share editor → viewer ditolak POST (403) → node CRUD.
- **Playwright** (smoke e2e): register → buat peta → tambah node → tulis Markdown → logout → user kedua (di-invite) login → melihat node + markdown-nya.
- **Checklist QA manual**: undo/redo tidak rusak oleh update remote, reconnect browser, error quota, mobile layout.

## Struktur Repo (rencana awal)

```
app/
  (landing)/page.tsx
  auth/{login,register,reset-password}/page.tsx
  maps/page.tsx            # dashboard
  maps/[id]/page.tsx       # editor
  api/auth/[...all]/route.ts
  api/maps/route.ts
  api/maps/[id]/...        # state, nodes, files, presence, collaborators
components/                # shadcn/ui + kustom (canvas-bridge, md-panel, topbar, dll)
lib/
  auth.ts                  # better-auth instance (Drizzle adapter)
  db.ts                    # @libsql/client singleton + drizzle
  schema.ts                # seluruh Drizzle schema (incl. tabel better-auth)
  excalidraw-bridge.ts     # isolasi semua API Excalidraw
  scene.ts                 # merge/revision logic
  guards.ts                # authz role check
drizzle.config.ts
playwright.config.ts
```

## Versi di-pin

| Paket | Versi |
|---|---|
| next | 16.3.3 |
| react / react-dom | 19.2.8 |
| @excalidraw/excalidraw | 0.18.1 |
| better-auth | 1.7.2 |
| @better-auth/drizzle-adapter | 1.7.2 |
| drizzle-orm | 0.45.2 |
| drizzle-kit | 0.31.10 |
| @libsql/client | 0.17.4 |
| react-markdown + remark-gfm | pin stable saat scaffold (catat di package.json) |
| CodeMirror 6 (editor Markdown) | pin stable saat scaffold (catat di package.json) |
| tailwindcss | v4 |
| zod | pin stable saat scaffold (catat di package.json) |
| framer-motion | pin stable saat scaffold (catat di package.json) |
| vitest / @playwright/test | pin stable saat scaffold (catat di package.json) |

**Jangan** pakai: `@drizzle-team/turbo` (404), Yjs (fase 2), tldraw (lisensi), `@y/*` pre-release, Drizzle 1.0 RC.

## Biaya

- Vercel Hobby: $0. Turso free: $0 (upgrade Developer $4.99/bln jika mendekati 10M writes/bln). Resend free tier untuk email. **Total awal: $0/bln.**

## Scope di luar v1 (fase 2, upgrade path siap)

- Real-time sejati (Yjs + Hocuspocus) — struktur data & API tak berubah.
- Invite ke user yang belum terdaftar, version history/restore, komentar, template peta, export PDF, thumbnail generatif server-side.

## Urutan Build

1. Scaffold Next.js + Turso + Drizzle + migrations
2. better-auth + guards authz
3. Landing & auth pages
4. Dashboard CRUD peta
5. Editor Excalidraw + node + panel Markdown
6. Polling sync + presence + sharing
7. Gambar, export, archive, polish UI
8. Test + deploy Vercel
