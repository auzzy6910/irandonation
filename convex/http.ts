import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function verifySignature(
  payload: string,
  signature: string,
  merchantKey: string
): boolean {
  // Compute HMAC-SHA256 for signature verification
  // Convex HTTP actions run in a V8 isolate; use require for crypto access
  let hmac = "";
  try {
    const { createHmac } = require("crypto");
    hmac = createHmac("sha256", merchantKey).update(payload).digest("hex");
  } catch {
    console.warn("crypto module not available for signature verification");
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (hmac.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < hmac.length; i++) {
    result |= hmac.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

const tripleAWebhook = httpAction(async (ctx, request) => {
  const merchantKey = process.env.TRIPLEA_MERCHANT_KEY;
  if (!merchantKey) {
    console.error("Missing TRIPLEA_MERCHANT_KEY environment variable");
    return new Response("Server configuration error", { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("triplea-signature") ?? "";

  if (!verifySignature(payload, signature, merchantKey)) {
    console.error("Invalid Triple-A webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(payload);

  if (event.event_type === "payment.success") {
    const orderId = event.order_id;

    await ctx.runMutation(internal.payments.markPaymentCompleted, {
      tripleAOrderId: orderId,
    });
  }

  return new Response("OK", { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/triplea-webhook",
  method: "POST",
  handler: tripleAWebhook,
});

export default http;
