"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

async function getAccessToken(): Promise<string> {
  const apiUrl = process.env.TRIPLEA_API_URL;
  const clientId = process.env.TRIPLEA_CLIENT_ID;
  const clientSecret = process.env.TRIPLEA_CLIENT_SECRET;

  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error(
      "Missing TRIPLEA_API_URL, TRIPLEA_CLIENT_ID, or TRIPLEA_CLIENT_SECRET environment variables"
    );
  }

  const response = await fetch(`${apiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Triple-A OAuth token request failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

export const createPayment = action({
  args: {
    amount: v.number(),
    currency: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const accessToken = await getAccessToken();

    const apiUrl = process.env.TRIPLEA_API_URL;
    if (!apiUrl) {
      throw new Error("Missing TRIPLEA_API_URL environment variable");
    }

    const paymentResponse = await fetch(`${apiUrl}/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "widget",
        merchant_key: process.env.TRIPLEA_MERCHANT_KEY,
        order_currency: args.currency,
        order_amount: args.amount,
        notify_url: "https://combative-chicken-671.convex.site/triplea-webhook",
      }),
    });

    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.text();
      throw new Error(
        `Triple-A create payment failed (${paymentResponse.status}): ${errorBody}`
      );
    }

    const paymentData = await paymentResponse.json();

    await ctx.runMutation(internal.payments.insertPayment, {
      status: "pending",
      amount: args.amount,
      currency: args.currency,
      tripleAOrderId: paymentData.order_id,
      userId: args.userId,
    });

    return {
      checkoutUrl: paymentData.hosted_url,
      orderId: paymentData.order_id,
    };
  },
});
