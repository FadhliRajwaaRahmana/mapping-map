import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { auth } from "@/lib/auth";
import { POST as postMaps, GET as getMaps } from "@/app/api/maps/route";
import { GET as getMap, PATCH as patchMap, DELETE as deleteMap } from "@/app/api/maps/[id]/route";
import { GET as getState, POST as postState } from "@/app/api/maps/[id]/state/route";
import { POST as postNodes, GET as getNodes } from "@/app/api/maps/[id]/nodes/route";
import { GET as getNode, PATCH as patchNode, DELETE as deleteNode } from "@/app/api/maps/[id]/nodes/[nodeId]/route";

// `lib/guards.ts` calls next/headers's headers(), which needs a Next request
// scope (AsyncLocalStorage) that only exists inside the real Next server. When
// we call route handlers directly in vitest there is no scope, so headers()
// throws "outside a request scope". We emulate the scope: in production
// headers() returns the incoming request's headers, so the handler's Request
// headers ARE the headers() result. `use(req)` binds that binding before a
// handler runs (execution is serial, one request at a time, so a single slot is
// safe).
const reqCtx = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(reqCtx.headers),
}));

const use = (r: Request): Request => {
  reqCtx.headers = r.headers;
  return r;
};

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

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

describe("maps API", () => {
  it("creates a map (with owner collaborator) and lists it", async () => {
    const cookie = await signUp(`m${Date.now()}@example.com`);
    const createRes = await postMaps(
      use(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Peta Uji", description: "" }),
        }),
      ),
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { data: { id: string } };
    expect(created.data.id).toBeTruthy();

    const listRes = await getMaps(
      use(
        new Request("http://localhost:3000/api/maps", {
          method: "GET",
          headers: { cookie },
        }),
      ),
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { data: Array<{ id: string; title: string; role: string }> };
    expect(list.data.some((m) => m.id === created.data.id && m.role === "owner")).toBe(true);
  });
  it("rejects create when not signed in", async () => {
    const res = await postMaps(
      use(
        new Request("http://localhost:3000/api/maps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "X" }),
        }),
      ),
    );
    expect(res.status).toBe(401);
  });

  it("gets one map, renames it (owner), and deletes it", async () => {
    const cookie = await signUp(`d${Date.now()}@example.com`);
    const created = (await (
      await postMaps(
        use(
          new Request("http://localhost:3000/api/maps", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ title: "Akan dihapus" }),
          }),
        ),
      )
    ).json()) as { data: { id: string } };
    const id = created.data.id;

    const one = await getMap(use(new Request("http://localhost:3000/api/maps/" + id, { headers: { cookie } })), ctx(id));
    expect(one.status).toBe(200);
    const oneBody = (await one.json()) as { data: { map: { title: string; role: string }; state: null } };
    expect(oneBody.data.map.title).toBe("Akan dihapus");
    expect(oneBody.data.map.role).toBe("owner");
    expect(oneBody.data.state).toBeNull(); // no state saved yet

    const patched = await patchMap(
      use(
        new Request("http://localhost:3000/api/maps/" + id, {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ title: "Ganti nama", isArchived: true }),
        }),
      ),
      ctx(id),
    );
    expect(patched.status).toBe(200);
    const patchedBody = (await patched.json()) as { data: { title: string; isArchived: boolean } };
    expect(patchedBody.data.title).toBe("Ganti nama");
    expect(patchedBody.data.isArchived).toBe(true);

    const del = await deleteMap(use(new Request("http://localhost:3000/api/maps/" + id, { method: "DELETE", headers: { cookie } })), ctx(id));
    expect(del.status).toBe(200);
    const after = await getMap(use(new Request("http://localhost:3000/api/maps/" + id, { headers: { cookie } })), ctx(id));
    expect(after.status).toBe(404);
  });
});

/* ------------------------------------------------------------------ */
/*  State save + poll (ETag, merge, 413)                              */
/* ------------------------------------------------------------------ */

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
        use(
          new Request("http://localhost:3000/api/maps", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ title: "Sync" }),
          }),
        ),
      )
    ).json()) as { data: { id: string } };
    const id = created.data.id;

    // First save
    const post = await postState(
      use(
        new Request(`http://localhost:3000/api/maps/${id}/state`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ scene: sceneWithRects(2), baseRevision: 0 }),
        }),
      ),
      ctx(id),
    );
    expect(post.status).toBe(200);
    expect(post.headers.get("etag")).toBe('"1"');
    const postBody = (await post.json()) as { data: { revision: number } };
    expect(postBody.data.revision).toBe(1);

    // Poll with matching ETag → 304
    const poll = await getState(
      use(
        new Request(`http://localhost:3000/api/maps/${id}/state`, {
          headers: { cookie, "if-none-match": '"1"' },
        }),
      ),
      ctx(id),
    );
    expect(poll.status).toBe(304);

    // Second save with more elements → merges
    const post2 = await postState(
      use(
        new Request(`http://localhost:3000/api/maps/${id}/state`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ scene: sceneWithRects(3), baseRevision: 1 }),
        }),
      ),
      ctx(id),
    );
    const body2 = (await post2.json()) as {
      data: { revision: number; scene: { elements: unknown[] } };
    };
    expect(body2.data.revision).toBe(2);
    expect(body2.data.scene.elements.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects oversized scenes with 413", async () => {
    const cookie = await signUp(`big${Date.now()}@example.com`);
    const created = (await (
      await postMaps(
        use(
          new Request("http://localhost:3000/api/maps", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ title: "Big" }),
          }),
        ),
      )
    ).json()) as { data: { id: string } };
    const huge = sceneWithRects(2);
    huge.files = {
      big: {
        id: "big",
        mimeType: "image/png",
        dataURL: "data:image/png;base64," + "A".repeat(5 * 1024 * 1024),
        created: 1,
      },
    };
    const res = await postState(
      use(
        new Request(
          `http://localhost:3000/api/maps/${created.data.id}/state`,
          {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ scene: huge, baseRevision: 0 }),
          },
        ),
      ),
      ctx(created.data.id),
    );
    expect(res.status).toBe(413);
  });
});

/* ------------------------------------------------------------------ */
/*  Nodes CRUD + role enforcement                                     */
/* ------------------------------------------------------------------ */

const nodeCtx = (id: string, nodeId: string) => ({
  params: Promise.resolve({ id, nodeId }),
});

describe("nodes API + role enforcement", () => {
  async function makeMap(ownerEmail: string) {
    const cookie = await signUp(ownerEmail);
    const created = (await (
      await postMaps(
        use(
          new Request("http://localhost:3000/api/maps", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ title: "Roles" }),
          }),
        ),
      )
    ).json()) as { data: { id: string } };
    return { cookie, mapId: created.data.id };
  }

  it("owner creates, reads, patches, deletes a node", async () => {
    const { cookie, mapId } = await makeMap(`n1${Date.now()}@example.com`);
    const nodeId = crypto.randomUUID();

    const created = await postNodes(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({
            id: nodeId,
            elementId: "el-1",
            title: "Riset",
          }),
        }),
      ),
      ctx(mapId),
    );
    expect(created.status).toBe(201);

    const list = await getNodes(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
          headers: { cookie },
        }),
      ),
      ctx(mapId),
    );
    expect(
      ((await list.json()) as { data: unknown[] }).data.length,
    ).toBe(1);

    const patched = await patchNode(
      use(
        new Request(
          `http://localhost:3000/api/maps/${mapId}/nodes/${nodeId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ contentMd: "# Halo" }),
          },
        ),
      ),
      nodeCtx(mapId, nodeId),
    );
    expect(patched.status).toBe(200);
    expect(
      ((await patched.json()) as { data: { contentMd: string } }).data
        .contentMd,
    ).toBe("# Halo");

    const deleted = await deleteNode(
      use(
        new Request(
          `http://localhost:3000/api/maps/${mapId}/nodes/${nodeId}`,
          { method: "DELETE", headers: { cookie } },
        ),
      ),
      nodeCtx(mapId, nodeId),
    );
    expect(deleted.status).toBe(200);

    const list2 = await getNodes(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
          headers: { cookie },
        }),
      ),
      ctx(mapId),
    );
    expect(
      ((await list2.json()) as { data: unknown[] }).data.length,
    ).toBe(0);
  });

  it("viewer can read but not write nodes", async () => {
    const { mapId } = await makeMap(`n2${Date.now()}@example.com`);
    const viewerEmail = `viewer${Date.now()}@example.com`;

    // Sign the viewer up, then add as viewer collaborator directly in DB
    const { db } = await import("@/lib/db");
    const { mapCollaborators } = await import("@/lib/schema");
    const viewer = await auth.api.signUpEmail({
      body: { name: "Viewer", email: viewerEmail, password: "Password123!" },
    });
    await db.insert(mapCollaborators).values({
      mapId,
      userId: viewer.user.id,
      role: "viewer",
      createdAt: new Date(),
    });

    // Get a session cookie for the viewer (better-auth 1.7.2 pattern)
    const vSignIn = await auth.api.signInEmail({
      body: { email: viewerEmail, password: "Password123!" },
      asResponse: true,
    });
    const vCookie = vSignIn.headers.get("set-cookie")!.split(";")[0];

    // Viewer can read
    const readOk = await getNodes(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
          headers: { cookie: vCookie },
        }),
      ),
      ctx(mapId),
    );
    expect(readOk.status).toBe(200);

    // Viewer cannot write
    const nodeId = crypto.randomUUID();
    const writeDenied = await postNodes(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}/nodes`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: vCookie,
          },
          body: JSON.stringify({
            id: nodeId,
            elementId: "el-x",
            title: "nope",
          }),
        }),
      ),
      ctx(mapId),
    );
    expect(writeDenied.status).toBe(403);
  });

  it("stranger gets 403 on a private map", async () => {
    const { mapId } = await makeMap(`n3${Date.now()}@example.com`);
    const strangerCookie = await signUp(`s2${Date.now()}@example.com`);
    const res = await getMap(
      use(
        new Request(`http://localhost:3000/api/maps/${mapId}`, {
          headers: { cookie: strangerCookie },
        }),
      ),
      ctx(mapId),
    );
    // requireMapRole: map exists but no collaborator row → 403
    expect(res.status).toBe(403);
  });
});
