// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    // Hedera fields (populated dynamically when the user first logs in)
    hederaAccountId: v.optional(v.string()),
    hederaPrivateKey: v.optional(v.string()), 
  }).index("by_email", ["email"]),

  documents: defineTable({
    userId: v.string(), // Links to the Better Auth User ID
    title: v.string(),
    issuer: v.string(),
    description: v.optional(v.string()),
    fileHash: v.string(),
    hederaSequence: v.string(),
    topicId: v.string(),
  }).index("by_fileHash", ["fileHash"])
    .index("by_user", ["userId"]),
});