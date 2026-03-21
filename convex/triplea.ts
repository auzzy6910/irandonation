"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function getApiBaseUrl(): string {
  return process.env.TRIPLE_A_API_URL || "https://api.triple-a.io";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.TRIPLE_A_CLIENT_ID;
  const clientSecret = process.env.TRIPLE_A_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing TRIPLE_A_CLIENT_ID or TRIPLE_A_CLIENT_SECRET environment variables"
    );
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v2/oauth/token`, {
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
    const merchantKey = process.env.TRIPLE_A_MERCHANT_KEY;
    const notifySecret = process.env.TRIPLE_A_NOTIFY_SECRET;
    const siteUrl = process.env.CONVEX_SITE_URL;

    if (!merchantKey) {
      throw new Error("Missing TRIPLE_A_MERCHANT_KEY environment variable");
    }
    if (!siteUrl) {
      throw new Error("Missing CONVEX_SITE_URL environment variable");
    }

    const accessToken = await getAccessToken();
    const baseUrl = getApiBaseUrl();
    const notifyUrl = `${siteUrl}/triplea-webhook`;

    const requestBody: Record<string, unknown> = {
      type: "widget",
      merchant_key: merchantKey,
      order_currency: args.currency,
      order_amount: args.amount,
      notify_url: notifyUrl,
      payer_id: args.userId,
      payer_email: args.userId,
    };

    if (notifySecret) {
      requestBody.notify_secret = notifySecret;
    }

    const paymentResponse = await fetch(`${baseUrl}/api/v2/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
      tripleAOrderId: paymentData.payment_reference,
      paymentReference: paymentData.payment_reference,
      hostedUrl: paymentData.hosted_url,
      userId: args.userId,
    });

    return {
      checkoutUrl: paymentData.hosted_url,
      paymentReference: paymentData.payment_reference,
    };
  },
});
