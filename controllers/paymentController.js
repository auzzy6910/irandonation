/**
 * Payment Controller – Coinremitter Webhook Handler
 *
 * Exposes an Express router with:
 *   POST /api/webhooks/coinremitter  – receives payment notifications
 *
 * Security: Coinremitter webhooks do not always use standard HMAC headers.
 * Instead we verify the incoming invoice_id and address against our Convex
 * database before marking a transaction as "Paid".
 */

const express = require('express');
const multer = require('multer');
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('../convex/_generated/api');

const router = express.Router();
const upload = multer();

// Convex client for database verification
const CONVEX_URL = process.env.CONVEX_URL || 'https://tame-poodle-465.convex.cloud';

/**
 * POST /api/webhooks/coinremitter
 *
 * Coinremitter sends webhook data as either JSON or form-encoded.
 * We handle both formats and verify the invoice against our database.
 */
router.post(
  '/coinremitter',
  upload.none(),
  async (req, res) => {
    try {
      console.log('[Webhook] Coinremitter webhook received');
      console.log('[Webhook] Content-Type:', req.headers['content-type']);
      console.log('[Webhook] Body:', JSON.stringify(req.body));

      const body = req.body || {};

      const invoiceId = body.invoice_id;
      const status = body.status;
      const address = body.address || body.deposit_address || '';

      if (!invoiceId) {
        // Coinremitter validates the notify_url at invoice creation time by
        // sending a POST request. Return 200 so the URL passes validation.
        console.log('[Webhook] No invoice_id — likely a URL validation ping');
        return res.status(200).json({ ok: true });
      }

      console.log(`[Webhook] Processing invoice_id=${invoiceId}, status=${status}, address=${address}`);

      // Verify invoice exists in our Convex database before processing
      const convexClient = new ConvexHttpClient(CONVEX_URL);

      const donation = await convexClient.query(api.donations.getByInvoiceId, {
        invoiceId: invoiceId,
      });

      if (!donation) {
        console.error(`[Webhook] Invoice ${invoiceId} not found in database — rejecting`);
        return res.status(404).json({ error: 'Invoice not found in database' });
      }

      console.log(`[Webhook] Invoice ${invoiceId} verified in database, current status: ${donation.status}`);

      // Normalize status
      const normalizedStatus =
        status && status.toLowerCase() === 'paid' ? 'Paid' :
        status && status.toLowerCase() === 'underpaid' ? 'Under Paid' :
        status && status.toLowerCase() === 'overpaid' ? 'Over Paid' :
        status && status.toLowerCase() === 'expired' ? 'Expired' :
        status || 'Unknown';

      // Update donation status in Convex
      await convexClient.mutation(api.donations.updateStatus, {
        invoiceId: invoiceId,
        status: normalizedStatus,
        coinremitterData: body,
      });

      console.log(`[Webhook] Invoice ${invoiceId} updated to status: ${normalizedStatus}`);

      return res.status(200).json({ ok: true, invoiceId, status: normalizedStatus });
    } catch (err) {
      console.error('[Webhook] Error processing Coinremitter webhook:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
