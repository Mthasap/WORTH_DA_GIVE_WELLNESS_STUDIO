// Vercel Serverless Function: /api/payfast-create
// Creates a signed PayFast checkout payload without exposing your PayFast passphrase in the browser.

function pfEncode(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function buildSignature(fields, passphrase) {
  const pairs = [];
  Object.keys(fields).forEach((key) => {
    if (key === 'signature') return;
    const value = fields[key];
    if (value !== undefined && value !== null && String(value) !== '') {
      pairs.push(`${key}=${pfEncode(value)}`);
    }
  });
  if (passphrase) pairs.push(`passphrase=${pfEncode(passphrase)}`);
  const crypto = require('crypto');
  return crypto.createHash('md5').update(pairs.join('&')).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
    const sandbox = String(process.env.PAYFAST_SANDBOX || 'true').toLowerCase() === 'true';

    if (!merchantId || !merchantKey || !siteUrl) {
      return res.status(500).json({ error: 'PayFast environment variables are not configured.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const amount = Number(body.amount);
    if (!body.order_id || !body.ref || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid order details.' });
    }

    const fields = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/track.html?ref=${encodeURIComponent(body.ref)}&payment=return`,
      cancel_url: `${siteUrl}/checkout.html?payment=cancelled&ref=${encodeURIComponent(body.ref)}`,
      notify_url: `${siteUrl}/api/payfast-itn`,
      name_first: body.name_first || '',
      name_last: body.name_last || '',
      email_address: body.email_address || '',
      m_payment_id: body.ref,
      amount: amount.toFixed(2),
      item_name: (body.item_name || `WorthDaGive Order ${body.ref}`).slice(0, 100),
      custom_str1: String(body.order_id),
      custom_str2: body.ref
    };

    fields.signature = buildSignature(fields, passphrase);

    return res.status(200).json({
      actionUrl: sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process',
      fields
    });
  } catch (err) {
    console.error('payfast-create error:', err);
    return res.status(500).json({ error: 'Could not create PayFast checkout.' });
  }
};
