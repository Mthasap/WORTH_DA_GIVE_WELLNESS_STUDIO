// ═══════════════════════════════════════════════════════════════
//  Vercel Serverless Function: /api/google-reviews
//  Fetches reviews from Google Places API and returns them.
//  Caches for 1 hour to avoid hitting API limits.
//
//  Environment variables required:
//    GOOGLE_PLACES_API_KEY  — from Google Cloud Console
//    GOOGLE_PLACE_ID        — your Google Business Place ID
//                             Find it at: developers.google.com/maps/documentation/places/web-service/place-id
//                             Search for "WorthDaGive Wellness Studio Constantia Kloof"
// ═══════════════════════════════════════════════════════════════

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://worthdagive.co.za');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // No query params accepted — reject any suspicious requests
  const urlQuery = req.url ? req.url.split('?')[1] : '';
  if (urlQuery && urlQuery.length > 0) {
    return res.status(400).json({ error: 'No query parameters accepted' });
  }

  // Return cached data if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    // Return empty so the site falls back to Supabase reviews gracefully
    return res.status(200).json({ reviews: [], source: 'unconfigured' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&key=${apiKey}`;
    const response = await fetch(url);
    const data     = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places error:', data.status, data.error_message);
      return res.status(200).json({ reviews: [], source: 'google_error', status: data.status });
    }

    const result = {
      businessName:   data.result.name,
      overallRating:  data.result.rating,
      totalReviews:   data.result.user_ratings_total,
      reviews: (data.result.reviews || []).map(r => ({
        author:       r.author_name,
        avatar:       r.profile_photo_url,
        rating:       r.rating,
        text:         r.text,
        time:         r.time,
        relativeTime: r.relative_time_description,
        source:       'google'
      })),
      source: 'google',
      fetchedAt: new Date().toISOString()
    };

    _cache     = result;
    _cacheTime = Date.now();

    return res.status(200).json(result);
  } catch (err) {
    console.error('google-reviews error:', err);
    return res.status(200).json({ reviews: [], source: 'error' });
  }
};
