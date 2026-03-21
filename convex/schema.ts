import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  payments: defineTable({
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    tripleAOrderId: v.string(),
    paymentReference: v.optional(v.string()),
    hostedUrl: v.optional(v.string()),
    userId: v.string(),
  }).index("by_tripleAOrderId", ["tripleAOrderId"]),
});
