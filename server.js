/**
 * Express server for the Iran Donation site.
 *
 * Serves the static frontend and exposes the Coinremitter webhook endpoint.
 * In production the Convex HTTP actions handle webhooks directly, but this
 * Express server provides an alternative / fallback webhook listener at
 * POST /api/webhooks/coinremitter.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const paymentController = require('./controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Mount webhook routes
app.use('/api/webhooks', paymentController);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] Webhook endpoint: POST http://localhost:${PORT}/api/webhooks/coinremitter`);
});
