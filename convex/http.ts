import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ─── CORS helpers ──────────────────────────────────────────────────────────────

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── createDonation endpoint ───────────────────────────────────────────────────

http.route({
  path: "/createDonation",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin") ?? "*";
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }),
});

http.route({
  path: "/createDonation",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin") ?? "*";
    try {
      const body = await request.json();
      const result = await ctx.runAction(api.tripleA.createDonation, {
        amount: Number(body.amount),
        currency: body.currency ?? "USD",
        donorName: body.donorName ?? undefined,
        donorEmail: body.donorEmail ?? undefined,
        successUrl: body.successUrl ?? origin,
        cancelUrl: body.cancelUrl ?? origin,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: "Failed to create donation", details: message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }
  }),
});

// ─── tripleaWebhook endpoint ───────────────────────────────────────────────────

http.route({
  path: "/tripleaWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      // Process the webhook via the action (which handles DB writes)
      const result = await ctx.runAction(api.tripleA.processWebhook, {
        status: body.status ?? "",
        payment_status: body.payment_status ?? undefined,
        order_amount: body.order_amount ? Number(body.order_amount) : undefined,
        order_currency: body.order_currency ?? undefined,
        crypto_currency: body.crypto_currency ?? undefined,
        crypto_amount: body.crypto_amount
          ? String(body.crypto_amount)
          : undefined,
        payment_reference: body.payment_reference ?? undefined,
        order_id: body.order_id ?? undefined,
        payer_id: body.payer_id ?? undefined,
        payer_name: body.payer_name ?? undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: "Webhook processing failed", details: message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

export default http;
