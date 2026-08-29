import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  session: {
    expiresIn: 60 * 60, // 60 menit
    updateAge: 60 * 30, // refresh tiap 30 menit jika aktif (sliding window)
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  database: drizzleAdapter(db, { provider: "sqlite" }),
  databaseHooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          if (!ctx) return;
          const u = (await ctx.context.internalAdapter.findUserById(session.userId)) as
            | {
                banned?: boolean | number | null;
                banExpires?: string | number | Date | null;
                banExpiresAt?: string | number | Date | null;
              }
            | null;
          if (!u?.banned) return;

          // Jika ban temporary dan sudah expired -> auto-unban lalu lanjutkan sign-in.
          const rawExp = (u as Record<string, unknown>).banExpires ?? (u as Record<string, unknown>).banExpiresAt ?? null;
          if (rawExp) {
            const expMs = new Date(rawExp as string | number | Date).getTime();
            if (!Number.isNaN(expMs) && expMs < Date.now()) {
              await ctx.context.internalAdapter.updateUser(session.userId, {
                banned: false,
                banReason: null,
                banExpires: null,
                banExpiresAt: null,
              } as unknown as Record<string, unknown>);
              return;
            }
          }

          throw new APIError("FORBIDDEN", {
            message: "Akun dinonaktifkan. Hubungi admin.",
          });
        },
      },
    },
  },
});
