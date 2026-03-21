"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Fetch an OAuth2 bearer token from Triple-A.
 */
async function getTripleAToken(): Promise<string> {
  const clientId = process.env.TRIPLE_A_CLIENT_ID;
  const clientSecret = process.env.TRIPLE_A_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing TRIPLE_A_CLIENT_ID or TRIPLE_A_CLIENT_SECRET");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const res = await fetch("https://api.triple-a.io/api/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Triple-A token error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Action: create a Triple-A payment invoice and return the hosted_url.
 */
export const createDonation = action({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
    donorName: v.optional(v.string()),
    donorEmail: v.optional(v.string()),
    successUrl: v.optional(v.string()),
    cancelUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    hosted_url: string;
    payment_reference: string;
    order_id: string;
  }> => {
    if (!args.amount || args.amount <= 0) {
      throw new Error("A positive donation amount is required");
    }

    // 1. Get Triple-A access token
    const accessToken = await getTripleAToken();

    // 2. Build payment request
    const merchantKey = process.env.TRIPLE_A_MERCHANT_KEY;
    const apiId = process.env.TRIPLE_A_API_ID;
    const webhookUrl = process.env.WEBHOOK_URL || "";

    if (!merchantKey || !apiId) {
      throw new Error("Missing TRIPLE_A_MERCHANT_KEY or TRIPLE_A_API_ID");
    }

    const orderId = `donation-${Date.now()}`;
    const payload: Record<string, unknown> = {
      type: "widget",
      merchant_key: merchantKey,
      order_currency: args.currency ?? "USD",
      order_amount: args.amount,
      payer_id: args.donorEmail || "anonymous@donor.com",
      order_id: orderId,
      notify_url: webhookUrl,
      notify_secret: process.env.TRIPLE_A_CLIENT_SECRET || "",
      success_url: args.successUrl || "",
      cancel_url: args.cancelUrl || "",
    };

    if (args.donorName) {
      payload.payer_name = args.donorName;
    }

    const paymentUrl = `https://api.triple-a.io/api/v2/payment/account/${apiId}`;

    const res = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Triple-A payment error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    return {
      hosted_url: data.hosted_url,
      payment_reference: data.payment_reference,
      order_id: orderId,
    };
  },
});

/**
 * Action: process a verified Triple-A webhook payload.
 * Called from the HTTP action after signature verification.
 */
export const processWebhook = action({
  args: {
    status: v.string(),
    payment_status: v.optional(v.string()),
    order_amount: v.optional(v.number()),
    order_currency: v.optional(v.string()),
    crypto_currency: v.optional(v.string()),
    crypto_amount: v.optional(v.string()),
    payment_reference: v.optional(v.string()),
    order_id: v.optional(v.string()),
    payer_id: v.optional(v.string()),
    payer_name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ received: boolean }> => {
    const effectiveStatus = args.status || args.payment_status || "";

    if (effectiveStatus === "confirmed") {
      const orderAmount = args.order_amount ?? 0;
      await ctx.runMutation(internal.donations.recordDonation, {
        paymentReference: args.payment_reference ?? "",
        orderId: args.order_id ?? "",
        amount: orderAmount,
        currency: args.order_currency ?? "USD",
        cryptoCurrency: args.crypto_currency ?? "",
        cryptoAmount: args.crypto_amount ?? "",
        payerEmail: args.payer_id ?? "",
        payerName: args.payer_name ?? "",
        status: "confirmed",
        confirmedAt: Date.now(),
      });
    }

    return { received: true };
  },
});
