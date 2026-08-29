import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { auth } from "@/lib/auth";
import { POST as postMaps, GET as getMaps } from "@/app/api/maps/route";
import { GET as getMap, PATCH as patchMap, DELETE as deleteMap } from "@/app/api/maps/[id]/route";

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
