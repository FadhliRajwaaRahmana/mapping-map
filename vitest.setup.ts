// Set a throwaway env before any lib module is imported by tests.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file::memory:";
process.env.DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? "";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-0000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
