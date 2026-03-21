import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Public query: anyone can read the global stats. */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("stats")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    return stats ?? { totalRaised: 0, totalDonations: 0, lastUpdated: 0 };
  },
});

/** Internal mutation: record a confirmed donation. Called by the webhook HTTP action. */
export const recordDonation = internalMutation({
  args: {
    paymentReference: v.string(),
    orderId: v.string(),
    amount: v.number(),
    currency: v.string(),
    cryptoCurrency: v.string(),
    cryptoAmount: v.string(),
    payerEmail: v.string(),
    payerName: v.string(),
    status: v.string(),
    confirmedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Insert donation record
    await ctx.db.insert("donations", args);

    // Upsert stats/global
    const existing = await ctx.db
      .query("stats")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalRaised: existing.totalRaised + args.amount,
        totalDonations: existing.totalDonations + 1,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("stats", {
        key: "global",
        totalRaised: args.amount,
        totalDonations: 1,
        lastUpdated: Date.now(),
      });
    }
  },
});
