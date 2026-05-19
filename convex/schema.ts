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
    documentType: v.optional(v.string()),
    fileHash: v.string(),
    hederaSequence: v.string(),
    topicId: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("expired"), v.literal("revoked"))),
    expiresAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  }).index("by_fileHash", ["fileHash"])
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  documentShares: defineTable({
    documentId: v.id("documents"),
    ownerUserId: v.string(),
    recipientEmail: v.string(),
    permission: v.union(v.literal("view"), v.literal("download")),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  }).index("by_document", ["documentId"])
    .index("by_recipientEmail", ["recipientEmail"]),

  apiKeys: defineTable({
    ownerUserId: v.string(),
    ownerEmail: v.string(),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    rawKey: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("deactivated"))),
    deactivatedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
  }).index("by_ownerUserId", ["ownerUserId"])
    .index("by_ownerUserId_and_status", ["ownerUserId", "status"])
    .index("by_keyPrefix", ["keyPrefix"]),

  auditLogs: defineTable({
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  }).index("by_actorUserId", ["actorUserId"])
    .index("by_entityType", ["entityType"]),
});
