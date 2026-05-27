// ═══════════════════════════════════════════════════════════════
//  Vercel Serverless Function: /api/whatsapp-order
//  Called by Make.com when a customer confirms a WhatsApp order.
//  Make.com handles the WhatsApp Business conversation flow and
//  calls this endpoint with the order details as JSON.
//
//  Environment variables required:
//    MAKE_WEBHOOK_SECRET       — a secret string you set in both
//                                Make.com and Vercel to verify calls
//    SUPABASE_URL
//    SUPABASE_SERVICE_ROLE_KEY
//    SITE_URL
// ═══════════════════════════════════════════════════════════════

function generateRef() {
  return 'WDG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function normalisePhone(phone) {
  if (!phone) return null;
  phone = String(phone).replace(/^whatsapp:/i, '').trim();
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+27' + phone.slice(1);
  }
  return phone;
}

async function findUserByPhone(db, phone) {
  const { data } = await db
    .from('profiles')
    .select('id, full_name, email')
    .eq('phone', phone)
    .maybeSingle();
  return data || null;
}

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
    payment_method: 'whatsapp_cod',
    payment_status: 'unpaid',
    status:         'pending',
    order_source:   'whatsapp',
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

  await db.from('order_items').insert({
    order_id:   order.id,
    product_id: productId || null,
    name:       productName,
    price,
    quantity,
    image:      ''
  });

  await db.from('order_tracking').insert({
    order_id: order.id,
    status:   'pending',
    note:     'Order received via WhatsApp.'
  });

  return order;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify call came from your Make.com scenario
    const makeSecret = process.env.MAKE_WEBHOOK_SECRET || '';
    const incoming   = req.headers['x-make-secret'] || '';
    if (makeSecret && incoming !== makeSecret) {
      console.error('Invalid Make.com webhook secret');
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const rawParsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Sanitise against prototype pollution attacks
    const body = Object.assign(Object.create(null), rawParsed);

    const fromPhone    = normalisePhone(body.phone || body.from || '');
    const productName  = body.productName  || body.product_name  || 'Unknown Product';
    const productId    = body.productId    || body.product_id    || null;
    const price        = Number(body.price    || 0);
    const quantity     = Number(body.quantity || 1);
    const deliveryType = (body.deliveryType || body.delivery_type || 'pickup').toLowerCase();
    const address      = body.address || null;

    if (!fromPhone || !price || !quantity) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const user = await findUserByPhone(db, fromPhone);
    const ref  = generateRef();

    const order = await createWhatsAppOrder(db, {
      phone: fromPhone,
      userId:   user ? user.id        : null,
      fullName: user ? user.full_name : null,
      productName, productId, price, quantity, deliveryType, address, ref
    });

    const siteUrl  = (process.env.SITE_URL || 'https://worthdagive.co.za').replace(/\/$/, '');
    const trackUrl = siteUrl + '/track.html?ref=' + encodeURIComponent(ref);
    const subtotal    = price * quantity;
    const deliveryFee = deliveryType === 'delivery' ? 50 : 0;
    const total       = subtotal + deliveryFee;

    // Return JSON to Make.com — Make.com sends confirmationMessage back to the customer
    return res.status(200).json({
      success:         true,
      ref,
      orderId:         order.id,
      linkedToAccount: !!user,
      confirmationMessage: [
        'Order confirmed! Thank you' + (user ? ', ' + user.full_name.split(' ')[0] : '') + '!',
        '',
        'Ref: ' + ref,
        productName + ' x' + quantity + ' - R' + subtotal.toFixed(2),
        deliveryType === 'delivery' ? 'Delivery - R' + deliveryFee.toFixed(2) : 'Pickup - Free',
        'Total: R' + total.toFixed(2),
        '',
        user ? 'This order is linked to your WorthDaGive account.' : 'Create an account: ' + siteUrl,
        '',
        'Track your order: ' + trackUrl,
        '',
        'We will be in touch to confirm. Thank you for choosing WorthDaGive!'
      ].join('\n')
    });

  } catch (err) {
    console.error('whatsapp-order error:', err);
    return res.status(500).json({
      success: false,
      confirmationMessage: 'Sorry, something went wrong. Please contact us directly on WhatsApp or visit worthdagive.co.za'
    });
  }
};
