// Vercel Serverless Function: /api/payfast-itn
// Receives PayFast ITN, verifies signature, validates with PayFast, then updates Supabase order status.

const crypto = require('crypto');

function pfEncode(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function parseBody(raw) {
  const params = new URLSearchParams(raw || '');
  const obj = {};
  for (const [key, value] of params.entries()) obj[key] = value;
  return obj;
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
  return crypto.createHash('md5').update(pairs.join('&')).digest('hex');
}

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function validateWithPayFast(rawBody, sandbox) {
  const validateUrl = sandbox
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

  const response = await fetch(validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody
  });
  const text = (await response.text()).trim();
  return text === 'VALID';
}

async function updateSupabase(orderId, ref, paymentStatus) {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service env variables are missing.');

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const status = paymentStatus === 'COMPLETE' ? 'payment_received' :
                 paymentStatus === 'CANCELLED' ? 'cancelled' : 'pending';
  const payStatus = paymentStatus === 'COMPLETE' ? 'paid' :
                    paymentStatus === 'CANCELLED' ? 'cancelled' : 'pending';

  const update = {
    status,
    payment_status: payStatus,
    payment_gateway: 'payfast',
    paid_at: paymentStatus === 'COMPLETE' ? new Date().toISOString() : null
  };

  let q = db.from('orders').update(update);
  if (orderId) q = q.eq('id', orderId);
  else q = q.eq('ref', ref);

  const { data, error } = await q.select('id').single();
  if (error) throw error;

  await db.from('order_tracking').insert({
    order_id: data.id,
    status,
    note: paymentStatus === 'COMPLETE'
      ? 'Payment received via PayFast.'
      : `PayFast payment status: ${paymentStatus}`
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    const rawBody = await readRawBody(req);
    const data = parseBody(rawBody);
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    const sandbox = String(process.env.PAYFAST_SANDBOX || 'true').toLowerCase() === 'true';

    const expectedSignature = buildSignature(data, passphrase);
    if (!data.signature || expectedSignature !== data.signature) {
      console.error('Invalid PayFast signature', { expectedSignature, received: data.signature });
      return res.status(400).send('Invalid signature');
    }

    const isValid = await validateWithPayFast(rawBody, sandbox);
    if (!isValid) return res.status(400).send('Invalid PayFast validation');

    await updateSupabase(data.custom_str1, data.custom_str2 || data.m_payment_id, data.payment_status);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('payfast-itn error:', err);
    return res.status(500).send('ITN error');
  }
};

// Important for Vercel: keep raw request body intact for PayFast signature validation.
module.exports.config = {
  api: {
    bodyParser: false
  }
};
