import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  donations: defineTable({
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
    coinremitterData: v.optional(v.any()),
  }).index("by_invoiceId", ["invoiceId"]),
});
