import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const insertPayment = internalMutation({
  args: {
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    tripleAOrderId: v.string(),
    paymentReference: v.optional(v.string()),
    hostedUrl: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      status: args.status,
      amount: args.amount,
      currency: args.currency,
      tripleAOrderId: args.tripleAOrderId,
      paymentReference: args.paymentReference,
      hostedUrl: args.hostedUrl,
      userId: args.userId,
    });
  },
});

export const markPaymentCompleted = internalMutation({
  args: {
    tripleAOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_tripleAOrderId", (q) =>
        q.eq("tripleAOrderId", args.tripleAOrderId)
      )
      .unique();

    if (!payment) {
      throw new Error(
        `Payment not found for order ID: ${args.tripleAOrderId}`
      );
    }

    await ctx.db.patch(payment._id, { status: "completed" });
  },
});
