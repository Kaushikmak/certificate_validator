// lib/auth.ts
import { betterAuth } from "better-auth";
import { LibsqlDialect } from "@libsql/kysely-libsql";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  database: new LibsqlDialect({
    url: tursoUrl,
    authToken: tursoAuthToken,
  }),
  emailAndPassword: {
    enabled: true,
  },
});
