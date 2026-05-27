// ═══════════════════════════════════════════════════════════════
//  Vercel Serverless Function: /api/yoco-create
//  Creates a YOCO Kount payment session securely on the server.
//  Your YOCO secret key never touches the browser.
//
//  Environment variables required (set in Vercel dashboard):
//    YOCO_SECRET_KEY       — from YOCO dashboard (starts with sk_live_ or sk_test_)
//    YOCO_PUBLIC_KEY       — from YOCO dashboard (starts with pk_live_ or pk_test_)
//    SITE_URL              — e.g. https://worthdagive.co.za
// ═══════════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  // ── CORS headers (allow your site origin)
  // Lock CORS to your domain only — never allow wildcard in production
  const allowedOrigin = process.env.SITE_URL || 'https://worthdagive.co.za';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Validate request origin — only accept calls from our own site
  const origin  = req.headers['origin'] || '';
  const referer = req.headers['referer'] || '';
  const siteUrl = process.env.SITE_URL || 'https://worthdagive.co.za';
  const validOrigin = origin.startsWith(siteUrl) || referer.startsWith(siteUrl);
  // In production, reject requests from unknown origins
  if (process.env.NODE_ENV === 'production' && !validOrigin && origin !== '') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY;
    const siteUrl   = (process.env.SITE_URL || '').replace(/\/$/, '');

    if (!secretKey) {
      console.error('YOCO_SECRET_KEY is not set');
      return res.status(500).json({ error: 'Payment gateway not configured.' });
    }

    const rawParsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const body = Object.assign(Object.create(null), rawParsed); // guard against prototype pollution

    // Validate required fields
    const amount = Number(body.amount);     // Amount in RANDS (e.g. 150.00)
    if (!body.order_id || !body.ref || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid order details.' });
    }

    // YOCO amounts are in CENTS (ZAR × 100)
    const amountCents = Math.round(amount * 100);

    // Build the YOCO Kount checkout session
    // Docs: https://developer.yoco.com/online/resources/integration-types/kount
    const yocoPayload = {
      amount:   amountCents,
      currency: 'ZAR',
      // Redirect URLs after payment
      successUrl: `${siteUrl}/track.html?ref=${encodeURIComponent(body.ref)}&payment=success`,
      cancelUrl:  `${siteUrl}/checkout.html?payment=cancelled&ref=${encodeURIComponent(body.ref)}`,
      failureUrl: `${siteUrl}/checkout.html?payment=failed&ref=${encodeURIComponent(body.ref)}`,
      // Metadata is passed through to the webhook so you can match the order
      metadata: {
        orderId:   String(body.order_id),
        orderRef:  body.ref,
        checkoutId: body.ref   // human-readable reference shown in YOCO dashboard
      }
    };

    // Add optional customer info if provided (improves dashboard records)
    if (body.email_address) {
      yocoPayload.customer = {
        email:     body.email_address,
        firstName: body.name_first || '',
        lastName:  body.name_last  || ''
      };
    }

    // Add line items if provided (shows in YOCO dashboard)
    if (body.item_name) {
      yocoPayload.lineItems = [
        {
          displayName: body.item_name.slice(0, 100),
          quantity:    1,
          pricingDetails: {
            price:    amountCents,
            tax:      0,
            discount: 0
          }
        }
      ];
    }

    // Call YOCO Kount API to create a checkout session
    const yocoRes = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${secretKey}`,
        'Idempotency-Key': body.ref   // prevents duplicate charges on retry
      },
      body: JSON.stringify(yocoPayload)
    });

    const yocoData = await yocoRes.json();

    if (!yocoRes.ok) {
      console.error('YOCO API error:', yocoData);
      return res.status(502).json({
        error: yocoData.errorCode
          ? `Payment error: ${yocoData.displayMessage || yocoData.errorCode}`
          : 'Could not create YOCO checkout session.'
      });
    }

    // Return the redirect URL and checkout ID to the browser
    // The browser then redirects the user to YOCO's hosted payment page
    return res.status(200).json({
      checkoutId:  yocoData.id,
      redirectUrl: yocoData.redirectUrl,   // send user here to pay
      publicKey:   process.env.YOCO_PUBLIC_KEY || ''
    });

  } catch (err) {
    console.error('yoco-create error:', err);
    return res.status(500).json({ error: 'Could not initialise payment.' });
  }
};
