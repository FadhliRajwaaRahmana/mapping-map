type Env = {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN?: string;
  AUTH_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
  RESEND_API_KEY?: string;
  SUPERADMIN_EMAIL?: string;
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
    SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || undefined,
  };
}

export const env = readEnv();
