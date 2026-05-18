// convex/users.ts
import { mutation, query, internalMutation,internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Public query: Check if user exists (Frontend safe, omits private key)
export const getUserInfo = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      hederaAccountId: user.hederaAccountId,
    };
  },
});

// Internal mutation: Only callable by your backend Actions (Backend safe)
export const upsertUserKeys = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    hederaAccountId: v.string(),
    hederaPrivateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hederaAccountId: args.hederaAccountId,
        hederaPrivateKey: args.hederaPrivateKey,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", args);
    }
  },
});

export const getInternalUserKeys = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});