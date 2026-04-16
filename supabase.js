// ═══════════════════════════════════════════════════════
//  WORTHDAGIVE — supabase.js
//  Loads the Supabase SDK from CDN, then exposes a
//  single `window.DB` object used by all other scripts.
//  Called once. All other files wait for window.DB.
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = "https://tndsmvsuowqdmhtatmie.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHNtdnN1b3dxZG1odGF0bWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM0MjAsImV4cCI6MjA5MDkwOTQyMH0.KLd3B-MQI1BBJSg98lfFugnqPDqeBBBGuM-cRbI0Eyw";

// Promise that resolves once Supabase client is ready
window._dbReady = new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = function() {
        window.DB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        resolve(window.DB);
    };
    s.onerror = function() {
        console.error('Failed to load Supabase SDK');
        reject(new Error('Supabase SDK failed to load'));
    };
    document.head.appendChild(s);
});

// Helper: get DB client (waits for SDK load)
async function getDB() {
    return window._dbReady;
}

// ─── AUTH ────────────────────────────────────────────

async function authRegister(email, password, fullName, dob) {
    var db = await getDB();
    var res = await db.auth.signUp({
        email: email, password: password,
        options: { data: { full_name: fullName, dob: dob } }
    });
    if (res.error) throw res.error;
    if (res.data.user) {
        await db.from('profiles').upsert({
            id: res.data.user.id,
            full_name: fullName,
            dob: dob,
            email: email
        });
    }
    return res.data;
}

async function authLogin(email, password) {
    var db = await getDB();
    var res = await db.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
}

async function authLogout() {
    var db = await getDB();
    await db.auth.signOut();
}

async function authGetSession() {
    var db = await getDB();
    var res = await db.auth.getSession();
    return res.data ? res.data.session : null;
}

async function authGetProfile() {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) return null;
    var res = await db.from('profiles').select('*').eq('id', sess.user.id).single();
    return res.data || null;
}

async function authOnChange(cb) {
    var db = await getDB();
    db.auth.onAuthStateChange(function(evt, sess) { cb(sess); });
}

// ─── PRODUCTS ────────────────────────────────────────

async function dbGetProducts() {
    var db = await getDB();
    var res = await db.from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
    if (res.error) { console.error('Products:', res.error); return []; }
    return res.data || [];
}

async function dbSaveProduct(product) {
    var db = await getDB();
    var res = await db.from('products').upsert(product).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbDeleteProduct(id) {
    var db = await getDB();
    var res = await db.from('products').update({ active: false }).eq('id', id);
    if (res.error) throw res.error;
}

// ─── BANNERS ─────────────────────────────────────────

async function dbGetActiveBanner() {
    var db = await getDB();
    var today = new Date().toISOString().slice(0, 10);
    var res = await db.from('banners')
        .select('*')
        .eq('active', true)
        .or('expires_at.is.null,expires_at.gte.' + today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (res.error) return null;
    return res.data;
}

async function dbSetBanner(text, color, expiresAt) {
    var db = await getDB();
    // Deactivate all existing
    await db.from('banners').update({ active: false }).neq('id', 0);
    var row = { text: text, color: color || 'green', active: true };
    if (expiresAt) row.expires_at = expiresAt;
    var res = await db.from('banners').insert(row).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbClearBanner() {
    var db = await getDB();
    await db.from('banners').update({ active: false }).neq('id', 0);
}

// ─── CATEGORIES ──────────────────────────────────────

async function dbGetCategories() {
    var db = await getDB();
    var res = await db.from('categories').select('*').order('name');
    if (res.error) return [];
    return res.data || [];
}

async function dbSaveCategory(name, subcategories) {
    var db = await getDB();
    var res = await db.from('categories').insert({ name: name, subcategories: subcategories || [] }).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbDeleteCategory(id) {
    var db = await getDB();
    await db.from('categories').delete().eq('id', id);
}

async function dbUpdateCategory(id, fields) {
    var db = await getDB();
    var res = await db.from('categories').update(fields).eq('id', id).select().single();
    if (res.error) throw res.error;
    return res.data;
}

// ─── ORDERS ──────────────────────────────────────────

async function dbCreateOrder(orderData, items) {
    var db = await getDB();
    var res = await db.from('orders').insert(orderData).select().single();
    if (res.error) throw res.error;
    var order = res.data;
    if (items && items.length) {
        var rows = items.map(function(i) { return Object.assign({}, i, { order_id: order.id }); });
        await db.from('order_items').insert(rows);
    }
    // Initial tracking entry
    await db.from('order_tracking').insert({ order_id: order.id, status: 'pending', note: 'Order received.' });
    return order;
}

async function dbGetOrderByRef(ref) {
    var db = await getDB();
    var res = await db.from('orders').select('*, order_items(*), order_tracking(*)').eq('ref', ref).single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbGetMyOrders(userId) {
    var db = await getDB();
    var res = await db.from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}
