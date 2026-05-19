import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createShare = mutation({
  args: {
    documentId: v.id("documents"),
    ownerUserId: v.string(),
    recipientEmail: v.string(),
    permission: v.union(v.literal("view"), v.literal("download")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.userId !== args.ownerUserId) {
      throw new Error("Only owner can share this document");
    }

    const shareId = await ctx.db.insert("documentShares", {
      ...args,
      recipientEmail: args.recipientEmail.toLowerCase(),
    });

    await ctx.db.insert("auditLogs", {
      action: "document.shared",
      entityType: "documentShare",
      entityId: shareId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({
        documentId: args.documentId,
        recipientEmail: args.recipientEmail.toLowerCase(),
        permission: args.permission,
        expiresAt: args.expiresAt ?? null,
      }),
    });

    return shareId;
  },
});

export const revokeShare = mutation({
  args: {
    shareId: v.id("documentShares"),
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share not found");
    }
    if (share.ownerUserId !== args.ownerUserId) {
      throw new Error("Only owner can revoke this share");
    }
    await ctx.db.patch(args.shareId, { revokedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      action: "document.share_revoked",
      entityType: "documentShare",
      entityId: args.shareId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ documentId: share.documentId }),
    });
    return { success: true };
  },
});

export const listSharesForDocument = query({
  args: {
    documentId: v.id("documents"),
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.userId !== args.ownerUserId) {
      return [];
    }
    return await ctx.db
      .query("documentShares")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(100);
  },
});

export const listSharedWithEmail = query({
  args: { recipientEmail: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentShares")
      .withIndex("by_recipientEmail", (q) => q.eq("recipientEmail", args.recipientEmail.toLowerCase()))
      .order("desc")
      .take(100);
  },
});
