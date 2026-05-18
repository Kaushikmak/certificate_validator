// lib/auth.ts
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// This creates a dedicated SQLite file just for auth sessions and users
const db = new Database("auth.db");

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
});