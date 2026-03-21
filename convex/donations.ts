import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertDonation = internalMutation({
  args: {
    amount: v.number(),
    currency: v.string(),
    donorFirstName: v.string(),
    donorLastName: v.string(),
    donorEmail: v.string(),
    frequency: v.string(),
    dedicateName: v.optional(v.string()),
    invoiceId: v.string(),
    invoiceUrl: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("donations", args);
  },
});

export const updateDonationStatus = internalMutation({
  args: {
    invoiceId: v.string(),
    status: v.string(),
    coinremitterData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_invoiceId", (q) => q.eq("invoiceId", args.invoiceId))
      .first();

    if (donation) {
      await ctx.db.patch(donation._id, {
        status: args.status,
        coinremitterData: args.coinremitterData,
      });
    }
  },
});
