"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Server-side Convex action that creates a Coinremitter invoice using the
 * lib/coinremitter.js utility and persists the donation to the database.
 */
export const createCoinremitterInvoice = action({
  args: {
    amount: v.number(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    frequency: v.string(),
    dedicateName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.COINREMITTER_API_KEY;
    const password = process.env.COINREMITTER_PASSWORD;

    if (!apiKey || !password) {
      throw new Error(
        "Missing COINREMITTER_API_KEY or COINREMITTER_PASSWORD environment variables. " +
        "Ensure the Wallet Password (not the account login password) is set."
      );
    }

    // Use the coinremitter-api SDK directly
    const Coinremitter = require("coinremitter-api");
    const wallet = new Coinremitter(apiKey, password);

    const siteUrl = process.env.CONVEX_SITE_URL;

    const invoiceParams = {
      amount: args.amount,
      name: `${args.firstName} ${args.lastName}`,
      fiat_currency: "USD",
      notify_url: `${siteUrl}/coinremitter-webhook`,
      success_url: `${siteUrl}/payment-success`,
      fail_url: `${siteUrl}/payment-fail`,
      description: `Donation of $${args.amount} from ${args.firstName} ${args.lastName}`,
      custom_data1: args.email.replace(/[^a-zA-Z0-9 -]/g, ""),
      custom_data2: args.frequency.replace(/[^a-zA-Z0-9 -]/g, ""),
    };

    console.log("[Coinremitter] Creating invoice with params:", JSON.stringify(invoiceParams));

    const result = await wallet.createInvoice(invoiceParams);

    console.log("[Coinremitter] API response:", JSON.stringify(result));

    if (!result.success) {
      const errorMsg = result.msg || "Failed to create Coinremitter invoice.";
      console.error("[Coinremitter] Invoice creation failed:", errorMsg);
      throw new Error(errorMsg);
    }

    // Persist the donation in the database
    await ctx.runMutation(internal.donations.insertDonation, {
      amount: args.amount,
      currency: "LTC",
      donorFirstName: args.firstName,
      donorLastName: args.lastName,
      donorEmail: args.email,
      frequency: args.frequency,
      dedicateName: args.dedicateName,
      invoiceId: result.data.invoice_id,
      invoiceUrl: result.data.url,
      status: "Pending",
    });

    return {
      invoiceId: result.data.invoice_id,
      invoiceUrl: result.data.url,
      amount: result.data.amount,
      usdAmount: result.data.usd_amount,
      expireOn: result.data.expire_on,
    };
  },
});
