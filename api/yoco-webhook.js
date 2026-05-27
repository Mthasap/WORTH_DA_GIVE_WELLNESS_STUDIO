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

// ── Send order notification to Make.com webhook
// Make.com then forwards a WhatsApp message to the admin via WhatsApp Business
async function notifyAdminWhatsApp(orderId, orderRef, total) {
  try {
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) return; // skip if not configured

    const payload = {
      orderId:   String(orderId),
      orderRef:  orderRef,
      total:     'R' + (total / 100).toFixed(2),
      adminUrl:  (process.env.SITE_URL || '') + '/admin.html',
      timestamp: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
    };

    await fetch(makeWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('Make.com notification failed (non-critical):', e.message);
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

    const raw = JSON.parse(rawBody.toString('utf8'));
    // Sanitise against prototype pollution
    const event = Object.create(null);
    Object.assign(event, raw);
    if (event.__proto__ !== undefined) delete event.__proto__;
    if (event.constructor !== undefined && typeof event.constructor !== 'function') delete event.constructor;
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
