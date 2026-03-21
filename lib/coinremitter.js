/**
 * Coinremitter API Utility
 *
 * Wraps the coinremitter-api SDK for creating invoices and
 * querying invoice status. Credentials are read from environment
 * variables so nothing is hard-coded.
 *
 * Required env vars:
 *   COINREMITTER_API_KEY   – Wallet API key from the Coinremitter dashboard
 *   COINREMITTER_PASSWORD  – Wallet Password (NOT the account login password)
 */

const Coinremitter = require('coinremitter-api');

/**
 * Initialise a Coinremitter wallet instance.
 * @returns {object} wallet instance
 */
function getWallet() {
  const apiKey = process.env.COINREMITTER_API_KEY;
  const password = process.env.COINREMITTER_PASSWORD;

  if (!apiKey || !password) {
    throw new Error(
      'Missing COINREMITTER_API_KEY or COINREMITTER_PASSWORD environment variables. ' +
      'Make sure the Wallet Password (not the account login password) is set.'
    );
  }

  return new Coinremitter(apiKey, password);
}

/**
 * Create an invoice via the Coinremitter API.
 *
 * @param {object} params
 * @param {number} params.amount        – Amount in fiat (USD by default)
 * @param {string} params.name          – Payer / donor name
 * @param {string} params.notifyUrl     – Webhook endpoint for payment notifications
 * @param {string} [params.successUrl]  – Redirect URL on successful payment
 * @param {string} [params.failUrl]     – Redirect URL on failed / cancelled payment
 * @param {string} [params.description] – Human-readable description
 * @param {string} [params.fiatCurrency]– Fiat currency code (default "USD")
 * @param {number} [params.expiryMinutes] – Invoice expiry in minutes
 * @param {string} [params.customData1] – Arbitrary custom data field 1
 * @param {string} [params.customData2] – Arbitrary custom data field 2
 * @returns {Promise<object>} Full API response
 */
async function createInvoice(params) {
  const wallet = getWallet();

  const invoiceParams = {
    amount: params.amount,
    name: params.name,
    fiat_currency: params.fiatCurrency || 'USD',
    notify_url: params.notifyUrl,
    success_url: params.successUrl || '',
    fail_url: params.failUrl || '',
    description: params.description || '',
    custom_data1: params.customData1 || '',
    custom_data2: params.customData2 || '',
  };

  if (params.expiryMinutes) {
    invoiceParams.expiry_time_in_minutes = params.expiryMinutes;
  }

  const response = await wallet.createInvoice(invoiceParams);

  // Coinremitter may return { success: false, msg: "..." } instead of
  // throwing, so surface the error explicitly.
  if (!response.success) {
    const errorMsg = response.msg || 'Unknown Coinremitter error';
    console.error('[Coinremitter] createInvoice failed:', JSON.stringify(response));
    throw new Error(`Coinremitter createInvoice failed: ${errorMsg}`);
  }

  console.log('[Coinremitter] Invoice created:', JSON.stringify(response.data));
  return response;
}

/**
 * Retrieve an invoice by its ID.
 *
 * @param {string} invoiceId – The Coinremitter invoice ID
 * @returns {Promise<object>} Full API response
 */
async function getInvoice(invoiceId) {
  const wallet = getWallet();

  const response = await wallet.getInvoice({ invoice_id: invoiceId });

  if (!response.success) {
    const errorMsg = response.msg || 'Unknown Coinremitter error';
    console.error('[Coinremitter] getInvoice failed:', JSON.stringify(response));
    throw new Error(`Coinremitter getInvoice failed: ${errorMsg}`);
  }

  console.log('[Coinremitter] Invoice fetched:', JSON.stringify(response.data));
  return response;
}

/**
 * Get the wallet balance.
 * @returns {Promise<object>} Full API response
 */
async function getBalance() {
  const wallet = getWallet();

  const response = await wallet.getBalance();

  if (!response.success) {
    console.error('[Coinremitter] getBalance failed:', JSON.stringify(response));
    throw new Error(`Coinremitter getBalance failed: ${response.msg || 'Unknown error'}`);
  }

  console.log('[Coinremitter] Balance:', JSON.stringify(response.data));
  return response;
}

module.exports = {
  getWallet,
  createInvoice,
  getInvoice,
  getBalance,
};
