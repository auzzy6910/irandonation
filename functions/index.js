const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });

/**
 * Retrieves an OAuth2 access token from Triple-A.
 * Uses client_credentials grant type.
 */
async function getTripleAAccessToken() {
  const clientId = process.env.TRIPLE_A_CLIENT_ID;
  const clientSecret = process.env.TRIPLE_A_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Triple-A credentials not configured in environment.");
  }

  const response = await axios.post(
    "https://api.triple-a.io/api/v2/oauth/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return response.data.access_token;
}

/**
 * createDonationInvoice
 *
 * HTTP callable function that:
 * 1. Performs the Triple-A OAuth2 handshake to get an access token.
 * 2. Creates a payment invoice via the Triple-A API.
 * 3. Returns the hosted payment URL to the client.
 *
 * Expected request body:
 *   { amount: number, currency: string, donorName: string, donorEmail: string }
 */
exports.createDonationInvoice = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { amount, currency, donorName, donorEmail } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ error: "A valid donation amount is required." });
        return;
      }

      const accessToken = await getTripleAAccessToken();

      const invoiceResponse = await axios.post(
        "https://api.triple-a.io/api/v2/payment",
        {
          type: "widget",
          merchant_key: process.env.TRIPLE_A_CLIENT_ID,
          order_currency: currency || "USD",
          order_amount: parseFloat(amount),
          payer_id: donorEmail || "anonymous@donor.com",
          order_id: `DON-${Date.now()}`,
          notify_url: process.env.TRIPLE_A_WEBHOOK_URL || "",
          success_url: process.env.SUCCESS_URL || "",
          cancel_url: process.env.CANCEL_URL || "",
          notify_secret: process.env.TRIPLE_A_NOTIFY_SECRET || "",
          webhook_data: {
            donorName: donorName || "Anonymous",
            donorEmail: donorEmail || "",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const paymentUrl =
        invoiceResponse.data.hosted_url ||
        invoiceResponse.data.payment_url ||
        "";

      res.status(200).json({
        success: true,
        paymentUrl,
        orderId: invoiceResponse.data.order_id || "",
      });
    } catch (error) {
      console.error(
        "Error creating donation invoice:",
        error.response ? error.response.data : error.message
      );
      res.status(500).json({
        error: "Failed to create donation invoice. Please try again.",
      });
    }
  });
});

/**
 * handleTripleAWebhook
 *
 * HTTP endpoint that receives webhook callbacks from Triple-A.
 *
 * Security:
 *   - Verifies the Triple-A signature header to ensure request authenticity.
 *
 * On a 'confirmed' payment status:
 *   - Increments the totalRaised field in donations/stats.
 *   - Logs the individual donation in the contributions collection.
 */
exports.handleTripleAWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // --- Signature Verification ---
    const signature = req.headers["triplea-signature"] || "";
    const notifySecret = process.env.TRIPLE_A_NOTIFY_SECRET || "";

    if (notifySecret) {
      const rawBody =
        typeof req.rawBody !== "undefined"
          ? req.rawBody
          : JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac("sha256", notifySecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("Webhook signature verification failed.");
        res.status(403).json({ error: "Invalid signature" });
        return;
      }
    }

    const payload = req.body;
    const paymentStatus = payload.status || payload.payment_status || "";
    const orderAmount =
      parseFloat(payload.order_amount) ||
      parseFloat(payload.crypto_amount) ||
      0;
    const orderId = payload.order_id || "";
    const webhookData = payload.webhook_data || {};

    if (paymentStatus === "confirmed" || paymentStatus === "done") {
      const statsRef = db.collection("donations").doc("stats");
      const contributionRef = db.collection("contributions").doc();

      const batch = db.batch();

      // Increment totalRaised in donations/stats
      batch.set(
        statsRef,
        {
          totalRaised: admin.firestore.FieldValue.increment(orderAmount),
          totalDonations: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Log individual donation in contributions collection
      batch.set(contributionRef, {
        orderId,
        amount: orderAmount,
        currency: payload.order_currency || "USD",
        donorName: webhookData.donorName || "Anonymous",
        donorEmail: webhookData.donorEmail || "",
        status: paymentStatus,
        paymentMethod: "crypto",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      console.log(
        `Donation confirmed: $${orderAmount} from ${webhookData.donorName || "Anonymous"} (Order: ${orderId})`
      );
    } else {
      console.log(`Webhook received with status: ${paymentStatus}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
