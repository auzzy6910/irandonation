import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  stats: defineTable({
    key: v.string(),
    totalRaised: v.number(),
    totalDonations: v.number(),
    lastUpdated: v.number(),
  }).index("by_key", ["key"]),

  donations: defineTable({
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
  }).index("by_orderId", ["orderId"]),
});
