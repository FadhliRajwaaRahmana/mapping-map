import { describe, it, expect } from "vitest";
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
