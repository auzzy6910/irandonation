import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Coinremitter Webhook — receives payment notifications.
 *
 * Coinremitter may send data as JSON or form-encoded. We handle both.
 * Security: We verify the invoice_id exists in our database before updating.
 */
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
      // Coinremitter webhooks often send form-encoded data
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        rawData[key] = value;
      });
      invoiceId = rawData["invoice_id"] || null;
      status = rawData["status"] || null;
    }

    console.log("[Webhook] Received payload:", JSON.stringify(rawData));

    if (!invoiceId) {
      // Coinremitter validates the notify_url at invoice creation time by
      // sending a POST request.  Return 200 so the URL passes validation.
      console.log("[Webhook] No invoice_id — likely a URL validation ping");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize the status string
    const normalizedStatus =
      status && status.toLowerCase() === "paid" ? "Paid" :
      status && status.toLowerCase() === "underpaid" ? "Under Paid" :
      status && status.toLowerCase() === "overpaid" ? "Over Paid" :
      status && status.toLowerCase() === "expired" ? "Expired" :
      status || "Unknown";

    await ctx.runMutation(internal.donations.updateDonationStatusInternal, {
      invoiceId,
      status: normalizedStatus,
      coinremitterData: rawData,
    });

    console.log(`[Webhook] Invoice ${invoiceId} updated to: ${normalizedStatus}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Payment success redirect page.
 */
http.route({
  path: "/payment-success",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      `<!DOCTYPE html>
<html><head><title>Payment Successful</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#faf6f1;">
<div style="text-align:center;max-width:480px;padding:40px;">
<h1 style="color:#1a3a5c;">Payment Successful!</h1>
<p style="color:#6b6560;line-height:1.7;">Thank you for your generous donation to Hope for Iran. Your contribution will make a real difference.</p>
<p style="color:#6b6560;">You may close this window.</p>
</div>
</body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }),
});

/**
 * Payment failure / cancellation redirect page.
 */
http.route({
  path: "/payment-fail",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      `<!DOCTYPE html>
<html><head><title>Payment Cancelled</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#faf6f1;">
<div style="text-align:center;max-width:480px;padding:40px;">
<h1 style="color:#1a3a5c;">Payment Cancelled</h1>
<p style="color:#6b6560;line-height:1.7;">Your payment was not completed. You can return to the donation page to try again.</p>
</div>
</body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }),
});

export default http;
