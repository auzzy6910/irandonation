import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  payments: defineTable({
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    tripleAOrderId: v.string(),
    userId: v.id("users"),
  }).index("by_tripleAOrderId", ["tripleAOrderId"]),
});
