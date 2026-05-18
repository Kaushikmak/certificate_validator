// lib/auth.ts
import { betterAuth } from "better-auth";
import { createClient } from "@libsql/client";

// Connect directly to the cloud-hosted Turso instance via environment flags
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  // Seamlessly auto-handles schema building on cloud DB during runtime initialization
  onInit: async (authContext: any) => {
    await authContext.init();
  }
});