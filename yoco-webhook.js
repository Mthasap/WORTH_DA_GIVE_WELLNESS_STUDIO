// ═══════════════════════════════════════════════════════════════
//  Vercel Serverless Function: /api/yoco-webhook
//  Receives YOCO payment notifications, verifies the webhook
//  signature, then updates your Supabase order status.
//
//  Environment variables required:
//    YOCO_WEBHOOK_SECRET       — from YOCO dashboard → Webhooks
//    SUPABASE_URL              — your Supabase project URL
//    SUPABASE_SERVICE_ROLE_KEY — service role key (NOT anon key)
//    SITE_URL                  — e.g. https://worthdagive.co.za
//
//  Register this webhook URL in your YOCO dashboard:
//    https://worthdagive.co.za/api/yoco-webhook
//  Events to subscribe: payment.succeeded, payment.failed
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');

// ── Read raw body (needed for signature verification)
async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);
    req.on('data', chunk => { data = Buffer.concat([data, chunk]); });
    req.on('end',  () => resolve(data));
    req.on('error', reject);
  });
}

// ── Verify YOCO webhook signature
// YOCO signs the body with HMAC-SHA256 using your webhook secret
function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  // YOCO sends: t=timestamp,v1=signature
  const parts = {};
  signature.split(',').forEach(part => {
    const [k, v] = part.split('=');
    parts[k] = v;
  });
  if (!parts.t || !parts.v1) return false;

  const payload      = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const isValid      = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));

  // Also check timestamp is within 5 minutes (replay attack prevention)
  const timestampAge = Math.abs(Date.now() / 1000 - Number(parts.t));
  return isValid && timestampAge < 300;
}

// ── Update order in Supabase
async function updateSupabase(orderId, orderRef, paymentStatus, yocoPaymentId) {
  const { createClient } = require('@supabase/supabase-js');
  const url        = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) throw new Error('Supabase service env vars missing.');

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Map YOCO payment status → your order statuses
  // YOCO statuses: succeeded, failed, cancelled, pending
  const statusMap = {
    succeeded: { status: 'payment_received', payment_status: 'paid' },
    failed:    { status: 'payment_failed',   payment_status: 'failed' },
    cancelled: { status: 'cancelled',        payment_status: 'cancelled' },
    pending:   { status: 'awaiting_payment', payment_status: 'pending' }
  };

  const mapped = statusMap[paymentStatus] || statusMap['pending'];

  const update = {
    status:           mapped.status,
    payment_status:   mapped.payment_status,
    payment_gateway:  'yoco',
    paid_at:          paymentStatus === 'succeeded' ? new Date().toISOString() : null,
    ...(yocoPaymentId && { payment_gateway_ref: yocoPaymentId })
  };

  // Match by ID first, fall back to ref
  let q = db.from('orders').update(update);
  if (orderId) q = q.eq('id', orderId);
  else         q = q.eq('ref', orderRef);

  const { data, error } = await q.select('id').single();
  if (error) throw error;

  // Add tracking event
  const trackingNote = paymentStatus === 'succeeded'
    ? 'Payment received via YOCO.'
    : `YOCO payment status: ${paymentStatus}.`;

  await db.from('order_tracking').insert({
    order_id: data.id,
    status:   mapped.status,
    note:     trackingNote
  });

  return data.id;
}

// ── Optional: send WhatsApp notification (see yoco-whatsapp.js for setup)
async function notifyAdminWhatsApp(orderId, orderRef, total) {
  try {
    const twilioSid    = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber   = process.env.TWILIO_WHATSAPP_FROM;  // e.g. whatsapp:+14155238886
    const adminNumber  = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. whatsapp:+27XXXXXXXXX

    if (!twilioSid || !twilioToken || !fromNumber || !adminNumber) return; // skip if not configured

    const message = `🛒 *New WorthDaGive Order!*\n\nRef: ${orderRef}\nOrder ID: ${orderId}\nTotal: R${(total / 100).toFixed(2)}\n\nView in admin: ${process.env.SITE_URL}/admin.html`;

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
      },
      body: new URLSearchParams({ From: fromNumber, To: adminNumber, Body: message }).toString()
    });
  } catch (e) {
    console.warn('WhatsApp notification failed (non-critical):', e.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    const rawBody  = await readRawBody(req);
    const webhookSecret = process.env.YOCO_WEBHOOK_SECRET || '';
    const signature     = req.headers['yoco-signature'] || req.headers['x-yoco-signature'] || '';

    // Verify signature (skip in dev/test if secret not set)
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid YOCO webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    console.log('YOCO webhook event:', event.type, event.id);

    // Only process payment events
    if (!event.type || !event.type.startsWith('payment.')) {
      return res.status(200).send('OK'); // acknowledge but ignore other events
    }

    const payment    = event.payload || {};
    const metadata   = payment.metadata || {};
    const orderId    = metadata.orderId  || null;
    const orderRef   = metadata.orderRef || payment.externalId || null;
    const total      = payment.amount    || 0; // in cents

    // Map event type to payment status
    const statusMap = {
      'payment.succeeded': 'succeeded',
      'payment.failed':    'failed',
      'payment.cancelled': 'cancelled'
    };
    const paymentStatus  = statusMap[event.type] || 'pending';
    const yocoPaymentId  = payment.id || null;

    if (!orderId && !orderRef) {
      console.error('YOCO webhook: no orderId or orderRef in metadata', event);
      return res.status(400).send('Missing order reference');
    }

    await updateSupabase(orderId, orderRef, paymentStatus, yocoPaymentId);

    // Fire WhatsApp admin notification on successful payment
    if (paymentStatus === 'succeeded') {
      await notifyAdminWhatsApp(orderId, orderRef, total);
    }

    return res.status(200).send('OK');

  } catch (err) {
    console.error('yoco-webhook error:', err);
    // Return 200 to prevent YOCO from retrying on our errors
    // (log the error and investigate in Vercel logs)
    return res.status(200).send('OK');
  }
};

// IMPORTANT: Vercel must NOT parse the body — we need the raw bytes for signature verification
module.exports.config = {
  api: { bodyParser: false }
};
