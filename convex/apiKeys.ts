import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createApiKeyRecord = mutation({
  args: {
    ownerUserId: v.string(),
    ownerEmail: v.string(),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    rawKey: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("apiKeys", {
      ...args,
      status: "active",
    });
    await ctx.db.insert("auditLogs", {
      action: "api_key.created",
      entityType: "apiKey",
      entityId: id,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ name: args.name, keyPrefix: args.keyPrefix }),
    });
    return id;
  },
});

export const listApiKeysForUser = query({
  args: { ownerUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", args.ownerUserId))
      .order("desc")
      .take(100);
  },
});

export const listActiveApiKeysForUser = query({
  args: { ownerUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_ownerUserId_and_status", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("status", "active"),
      )
      .order("desc")
      .take(100);
  },
});

export const listDeactivatedApiKeysForUser = query({
  args: { ownerUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_ownerUserId_and_status", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("status", "deactivated"),
      )
      .order("desc")
      .take(100);
  },
});

export const revokeApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) {
      throw new Error("API key not found");
    }
    if (key.ownerUserId !== args.ownerUserId) {
      throw new Error("Unauthorized revoke request");
    }
    await ctx.db.patch(args.keyId, {
      status: "deactivated",
      deactivatedAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      action: "api_key.revoked",
      entityType: "apiKey",
      entityId: args.keyId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ name: key.name, keyPrefix: key.keyPrefix }),
    });
    return { success: true };
  },
});

export const reactivateApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("API key not found");
    if (key.ownerUserId !== args.ownerUserId) throw new Error("Unauthorized request");
    await ctx.db.patch(args.keyId, {
      status: "active",
      deactivatedAt: undefined,
    });
    await ctx.db.insert("auditLogs", {
      action: "api_key.reactivated",
      entityType: "apiKey",
      entityId: args.keyId,
      actorUserId: args.ownerUserId,
      metadata: JSON.stringify({ name: key.name, keyPrefix: key.keyPrefix }),
    });
    return { success: true };
  },
});

export const updateApiKeyName = mutation({
  args: {
    keyId: v.id("apiKeys"),
    ownerUserId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("API key not found");
    if (key.ownerUserId !== args.ownerUserId) throw new Error("Unauthorized request");
    await ctx.db.patch(args.keyId, { name: args.name });
    return { success: true };
  },
});

export const deleteApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("API key not found");
    if (key.ownerUserId !== args.ownerUserId) throw new Error("Unauthorized request");
    await ctx.db.delete(args.keyId);
    return { success: true };
  },
});

export const cleanupExpiredDeactivatedKeys = mutation({
  args: {
    ownerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_ownerUserId_and_status", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("status", "deactivated"),
      )
      .collect();

    const now = Date.now();
    const ttlMs = 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const key of keys) {
      if (key.deactivatedAt && now - key.deactivatedAt >= ttlMs) {
        await ctx.db.delete(key._id);
        deleted += 1;
      }
    }
    return { deleted };
  },
});

export const getByPrefix = query({
  args: { keyPrefix: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_keyPrefix", (q) => q.eq("keyPrefix", args.keyPrefix))
      .first();
  },
});

export const touchLastUsed = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
    return { success: true };
  },
});
