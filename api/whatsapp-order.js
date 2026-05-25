// ═══════════════════════════════════════════════════════════════
//  Vercel Serverless Function: /api/whatsapp-order
//  Called by Twilio Studio when a customer confirms a WhatsApp order.
//  Matches the customer's phone number to their Supabase profile,
//  creates the order, and returns a confirmation message.
//
//  Environment variables required:
//    TWILIO_AUTH_TOKEN         — for request signature verification
//    SUPABASE_URL
//    SUPABASE_SERVICE_ROLE_KEY
//    SITE_URL
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');

// ── Verify this request genuinely came from Twilio
// Twilio signs every request with HMAC-SHA1 using your Auth Token
function verifyTwilioSignature(req, rawBody) {
  const authToken  = process.env.TWILIO_AUTH_TOKEN || '';
  const signature  = req.headers['x-twilio-signature'] || '';
  const siteUrl    = (process.env.SITE_URL || '').replace(/\/$/, '');
  const url        = `${siteUrl}/api/whatsapp-order`;

  // Build the string to sign: URL + sorted POST params
  const params     = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));
  const sortedKeys = Object.keys(params).sort();
  const strToSign  = url + sortedKeys.map(k => k + params[k]).join('');

  const expected   = crypto.createHmac('sha1', authToken).update(strToSign).digest('base64');
  return signature === expected;
}

// ── Parse URL-encoded body from Twilio
function parseBody(raw) {
  const params = new URLSearchParams(raw.toString('utf8'));
  const obj    = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data',  c => chunks.push(c));
    req.on('end',   () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Generate a short unique order ref
function generateRef() {
  return 'WDG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ── Normalise phone to E.164 (+27XXXXXXXXX)
function normalisePhone(phone) {
  if (!phone) return null;
  // Strip "whatsapp:" prefix if present (Twilio sends "whatsapp:+27...")
  phone = phone.replace(/^whatsapp:/i, '').trim();
  // If starts with 0, replace with +27
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+27' + phone.slice(1);
  }
  return phone;
}

// ── Find or create user by phone in Supabase
async function findUserByPhone(db, phone) {
  const { data } = await db
    .from('profiles')
    .select('id, full_name, email')
    .eq('phone', phone)
    .maybeSingle();
  return data || null;
}

// ── Create order in Supabase (linked to profile if found)
async function createWhatsAppOrder(db, { phone, userId, fullName, productName, productId, price, quantity, deliveryType, address, ref }) {
  const subtotal    = price * quantity;
  const deliveryFee = deliveryType === 'delivery' ? 50 : 0;
  const total       = subtotal + deliveryFee;

  const orderPayload = {
    ref,
    user_id:        userId || null,
    first_name:     (fullName || 'WhatsApp Customer').split(' ')[0],
    last_name:      (fullName || '').split(' ').slice(1).join(' ') || '',
    email:          null,
    phone,
    delivery_type:  deliveryType,
    address:        address || null,
    payment_method: 'whatsapp_cod',   // WhatsApp orders default to COD; can add YOCO link later
    payment_status: 'unpaid',
    status:         'pending',
    order_source:   'whatsapp',       // flag so admin knows it came from WhatsApp
    subtotal,
    delivery_fee:   deliveryFee,
    total,
    notes:          'Order placed via WhatsApp'
  };

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();

  if (orderErr) throw orderErr;

  // Insert order item
  await db.from('order_items').insert({
    order_id:   order.id,
    product_id: productId || null,
    name:       productName,
    price:      price,
    quantity:   quantity,
    image:      ''
  });

  // Initial tracking entry
  await db.from('order_tracking').insert({
    order_id: order.id,
    status:   'pending',
    note:     'Order received via WhatsApp.'
  });

  return order;
}

// ── Send a TwiML response back to Twilio Studio
function twimlResponse(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  if (req.method !== 'POST') {
    return res.status(405).send(twimlResponse('Method not allowed.'));
  }

  try {
    const rawBody = await readRawBody(req);

    // Verify the request is from Twilio (skip in sandbox/dev)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && !verifyTwilioSignature(req, rawBody)) {
      console.error('Invalid Twilio signature on /api/whatsapp-order');
      return res.status(403).send(twimlResponse('Unauthorised.'));
    }

    const body = parseBody(rawBody);

    // Twilio Studio passes variables via the request body
    // These are set by your Studio Flow widgets
    const fromPhone   = normalisePhone(body.From || body.from || '');
    const productName = body.productName  || body.product_name  || 'Unknown Product';
    const productId   = body.productId    || body.product_id    || null;
    const price       = Number(body.price || 0);
    const quantity    = Number(body.quantity || 1);
    const deliveryType = (body.deliveryType || body.delivery_type || 'pickup').toLowerCase();
    const address     = body.address || null;

    if (!fromPhone || !price || !quantity) {
      return res.status(400).send(twimlResponse('Sorry, we could not process your order. Please try again or contact us directly.'));
    }

    // Connect to Supabase using service role key
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Try to match this WhatsApp number to an existing account
    const user = await findUserByPhone(db, fromPhone);
    const ref  = generateRef();

    const order = await createWhatsAppOrder(db, {
      phone:        fromPhone,
      userId:       user ? user.id : null,
      fullName:     user ? user.full_name : null,
      productName,
      productId,
      price,
      quantity,
      deliveryType,
      address,
      ref
    });

    const siteUrl = (process.env.SITE_URL || 'https://worthdagive.co.za').replace(/\/$/, '');
    const trackUrl = `${siteUrl}/track.html?ref=${encodeURIComponent(ref)}`;

    // Build confirmation message
    const subtotal    = price * quantity;
    const deliveryFee = deliveryType === 'delivery' ? 50 : 0;
    const total       = subtotal + deliveryFee;

    const confirmMsg = [
      `Order confirmed! Thank you${user ? ', ' + user.full_name.split(' ')[0] : ''}`,
      ``,
      `Ref: ${ref}`,
      `${productName} x${quantity} - R${subtotal.toFixed(2)}`,
      deliveryType === 'delivery' ? `Delivery fee: R${deliveryFee.toFixed(2)}` : `Pickup (free)`,
      `Total: R${total.toFixed(2)}`,
      ``,
      user
        ? `This order is linked to your WorthDaGive account.`
        : `Create an account to track all your orders: ${siteUrl}`,
      ``,
      `Track your order: ${trackUrl}`,
      ``,
      `We will contact you to confirm delivery. Thank you for choosing WorthDaGive!`
    ].join('\n');

    return res.status(200).send(twimlResponse(confirmMsg));

  } catch (err) {
    console.error('whatsapp-order error:', err);
    return res.status(200).send(twimlResponse(
      'Sorry, something went wrong with your order. Please contact us directly on WhatsApp or visit worthdagive.co.za'
    ));
  }
};

module.exports.config = {
  api: { bodyParser: false }
};
