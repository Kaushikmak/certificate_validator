"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const storePdfForDocument = action({
  args: {
    documentId: v.id("documents"),
    ownerUserId: v.string(),
    bytes: v.bytes(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const blob = new Blob([args.bytes], { type: args.contentType || "application/pdf" });
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.documents.attachStorageIdInternal, {
      documentId: args.documentId,
      ownerUserId: args.ownerUserId,
      storageId,
    });
    return { storageId };
  },
});
