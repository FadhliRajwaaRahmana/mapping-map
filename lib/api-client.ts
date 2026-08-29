export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper for the app's JSON API (envelope `{ data }` on success,
 * `{ error, message }` on failure).
 * @remarks `init.headers` (if any) must be a plain `Record<string,string>`,
 * not a `Headers` instance — the merge below spreads it.
 */
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
  let json: { data: T };
  try {
    json = (await res.json()) as { data: T };
  } catch {
    throw new ApiError(res.status, "bad_response", `Respons tidak JSON (status ${res.status})`);
  }
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
