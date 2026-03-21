import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function hexEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function verifySignature(
  payload: string,
  signature: string,
  merchantKey: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(merchantKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSignature = hexEncode(signatureBuffer);

  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

const tripleAWebhook = httpAction(async (ctx, request) => {
  const merchantKey = process.env.TRIPLE_A_MERCHANT_KEY;
  if (!merchantKey) {
    console.error("Missing TRIPLE_A_MERCHANT_KEY environment variable");
    return new Response("Server configuration error", { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("triplea-signature") ?? "";

  const isValid = await verifySignature(payload, signature, merchantKey);
  if (!isValid) {
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
