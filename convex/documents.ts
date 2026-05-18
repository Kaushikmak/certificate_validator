// convex/documents.ts
import { mutation, query } from "./_generated/server";
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
    fileHash: v.string(),
    hederaSequence: v.string(),
    topicId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", args);
  },
});

export const getUserDocuments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc") // Shows newest first
      .collect();
  },
});