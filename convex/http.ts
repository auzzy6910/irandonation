import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/coinremitter-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let invoiceId: string | null = null;
    let status: string | null = null;
    let rawData: Record<string, string> = {};

    const contentType = request.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      rawData = json as Record<string, string>;
      invoiceId = rawData["invoice_id"] || null;
      status = rawData["status"] || null;
    } else {
      // Handle form-encoded data from Coinremitter webhooks
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        rawData[key] = value;
      });
      invoiceId = rawData["invoice_id"] || null;
      status = rawData["status"] || null;
    }

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoice_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedStatus =
      status && status.toLowerCase() === "paid" ? "Paid" : status || "Unknown";

    await ctx.runMutation(internal.donations.updateDonationStatus, {
      invoiceId,
      status: normalizedStatus,
      coinremitterData: rawData,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/payment-success",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(
      `<!DOCTYPE html>
<html><head><title>Payment Successful</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;">
<div style="text-align:center;">
<h1>Payment Successful!</h1>
<p>Thank you for your generous donation. You may close this window.</p>
</div>
</body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }),
});

http.route({
  path: "/payment-fail",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(
      `<!DOCTYPE html>
<html><head><title>Payment Cancelled</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;">
<div style="text-align:center;">
<h1>Payment Cancelled</h1>
<p>Your payment was not completed. You can return to the donation page to try again.</p>
</div>
</body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }),
});

export default http;
