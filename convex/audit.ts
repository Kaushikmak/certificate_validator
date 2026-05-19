import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logEvent = internalMutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});

export const getRecentByActor = query({
  args: { actorUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_actorUserId", (q) => q.eq("actorUserId", args.actorUserId))
      .order("desc")
      .take(50);
  },
});
