// convex/documents.ts
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByHash = query({
  args: { fileHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_fileHash", (q) => q.eq("fileHash", args.fileHash))
      .first();
  },
});

export const saveDocument = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    issuer: v.string(),
    description: v.optional(v.string()),
    documentType: v.string(),
    fileHash: v.string(),
    hederaSequence: v.string(),
    topicId: v.string(),
    expiresAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {
      ...args,
      status: args.expiresAt && args.expiresAt <= Date.now() ? "expired" : "active",
    });

    await ctx.db.insert("auditLogs", {
      action: "document.created",
      entityType: "document",
      entityId: docId,
      actorUserId: args.userId,
      metadata: JSON.stringify({
        fileHash: args.fileHash,
        topicId: args.topicId,
        hederaSequence: args.hederaSequence,
        documentType: args.documentType,
        expiresAt: args.expiresAt ?? null,
        hasFile: !!args.storageId,
      }),
    });

    return docId;
  },
});

export const getUserDocuments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc") // Shows newest first
      .take(100);
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

export const renewDocument = mutation({
  args: {
    documentId: v.id("documents"),
    ownerUserId: v.string(),
    newExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.userId !== args.ownerUserId) {
      throw new Error("Only owner can renew document");
    }
    if (args.newExpiresAt <= Date.now()) {
      throw new Error("Renewal expiry must be in the future");
    }
    await ctx.db.patch(args.documentId, {
      expiresAt: args.newExpiresAt,
      status: "active",
    });
    await ctx.db.insert("auditLogs", {
      action: "document.renewed",
      entityType: "document",
      entityId: args.documentId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ newExpiresAt: args.newExpiresAt }),
    });
    return { success: true };
  },
});

export const getDownloadUrl = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document?.storageId) {
      return null;
    }
    return await ctx.storage.getUrl(document.storageId);
  },
});

export const attachStorageIdInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    ownerUserId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.userId !== args.ownerUserId) {
      throw new Error("Only owner can attach document storage");
    }
    await ctx.db.patch(args.documentId, { storageId: args.storageId });
    await ctx.db.insert("auditLogs", {
      action: "document.file_attached",
      entityType: "document",
      entityId: args.documentId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ storageId: args.storageId }),
    });
    return { success: true };
  },
});
