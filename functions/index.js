const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });

// ─── helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch an OAuth2 bearer token from Triple-A.
 */
async function getTripleAToken() {
  const clientId = process.env.TRIPLE_A_CLIENT_ID;
  const clientSecret = process.env.TRIPLE_A_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing TRIPLE_A_CLIENT_ID or TRIPLE_A_CLIENT_SECRET");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const { data } = await axios.post(
    "https://api.triple-a.io/api/v2/oauth/token",
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  return data.access_token;
}

// ─── createDonation ────────────────────────────────────────────────────────────

exports.createDonation = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { amount, currency = "USD", donorName, donorEmail } = req.body;

      if (!amount || Number(amount) <= 0) {
        res.status(400).json({ error: "A positive donation amount is required" });
        return;
      }

      // 1. Get Triple-A access token
      const accessToken = await getTripleAToken();

      // 2. Build payment request
      const merchantKey = process.env.TRIPLE_A_MERCHANT_KEY;
      const apiId = process.env.TRIPLE_A_API_ID;

      if (!merchantKey || !apiId) {
        throw new Error("Missing TRIPLE_A_MERCHANT_KEY or TRIPLE_A_API_ID");
      }

      const paymentUrl =
        `https://api.triple-a.io/api/v2/payment/account/${apiId}`;

      const payload = {
        type: "widget",
        merchant_key: merchantKey,
        order_currency: currency,
        order_amount: Number(amount),
        payer_id: donorEmail || "anonymous@donor.com",
        order_id: `donation-${Date.now()}`,
        notify_url: process.env.WEBHOOK_URL || "",
        notify_secret: process.env.TRIPLE_A_NOTIFY_SECRET || process.env.TRIPLE_A_CLIENT_SECRET || "",
        success_url: req.headers.origin || req.headers.referer || "",
        cancel_url: req.headers.origin || req.headers.referer || "",
      };

      if (donorName) payload.payer_name = donorName;

      const { data } = await axios.post(paymentUrl, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // 3. Return the hosted checkout URL to the frontend
      res.status(200).json({
        hosted_url: data.hosted_url,
        payment_reference: data.payment_reference,
        order_id: payload.order_id,
      });
    } catch (err) {
      functions.logger.error("createDonation error", err.response?.data || err.message);
      res.status(500).json({
        error: "Failed to create donation",
        details: err.response?.data || err.message,
      });
    }
  });
});

// ─── tripleaWebhook ────────────────────────────────────────────────────────────

exports.tripleaWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    // 1. Verify webhook signature
    const notifySecret =
      process.env.TRIPLE_A_NOTIFY_SECRET || process.env.TRIPLE_A_CLIENT_SECRET || "";

    if (notifySecret) {
      // Use rawBody (provided by Firebase) so the hash matches the
      // exact bytes Triple-A signed, avoiding JSON re-serialisation drift.
      const rawBody = req.rawBody
        ? req.rawBody.toString("utf8")
        : JSON.stringify(req.body);

      const expectedSig = crypto
        .createHmac("sha256", notifySecret)
        .update(rawBody)
        .digest("hex");

      // Check common webhook signature headers
      const signature =
        req.headers["triplea-signature"] ||
        req.headers["x-triplea-signature"] ||
        req.headers["x-signature"] || "";

      if (signature) {
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expectedSig, "hex");

        if (
          sigBuf.length !== expBuf.length ||
          !crypto.timingSafeEqual(sigBuf, expBuf)
        ) {
          functions.logger.warn("Webhook signature mismatch");
          res.status(401).send("Invalid signature");
          return;
        }
      }
    }

    const event = req.body;
    functions.logger.info("Webhook received", { status: event.status });

    // 2. Only process confirmed payments
    if (event.status === "confirmed" || event.payment_status === "confirmed") {
      const orderAmount = Number(event.order_amount) || 0;
      const txnId =
        event.payment_reference ||
        event.order_id ||
        `txn-${Date.now()}`;

      // 2a. Log individual donation in the donations collection
      await db.collection("donations").doc(txnId).set({
        paymentReference: event.payment_reference || "",
        orderId: event.order_id || "",
        amount: orderAmount,
        currency: event.order_currency || "USD",
        cryptoCurrency: event.crypto_currency || "",
        cryptoAmount: event.crypto_amount || "",
        payerEmail: event.payer_id || "",
        payerName: event.payer_name || "",
        status: "confirmed",
        webhookPayload: event,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2b. Increment totalRaised in stats/global
      const statsRef = db.collection("stats").doc("global");
      await statsRef.set(
        {
          totalRaised: admin.firestore.FieldValue.increment(orderAmount),
          totalDonations: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      functions.logger.info("Donation recorded", { txnId, orderAmount });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    functions.logger.error("tripleaWebhook error", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
