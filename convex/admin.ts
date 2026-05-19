import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const clearAllData = mutation({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== "CLEAR_ALL_DATA") {
      throw new Error("Invalid confirmation token");
    }

    const tables = ["documentShares", "documents", "users", "auditLogs", "apiKeys"] as const;
    const deleted: Record<string, number> = {};

    for (const table of tables) {
      let count = 0;
      while (true) {
        const batch = await ctx.db.query(table).take(100);
        if (batch.length === 0) break;
        for (const row of batch) {
          await ctx.db.delete(row._id);
          count += 1;
        }
      }
      deleted[table] = count;
    }

    return { success: true, deleted };
  },
});
