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

async function authResetPassword(email) {
    var db = await getDB();
    var siteUrl = window.location.origin;
    var res = await db.auth.resetPasswordForEmail(email, {
        redirectTo: siteUrl + '/auth-callback.html'
    });
    if (res.error) throw res.error;
    return res.data;
}

async function authUpdatePassword(newPassword) {
    var db = await getDB();
    var res = await db.auth.updateUser({ password: newPassword });
    if (res.error) throw res.error;
    return res.data;
}

async function authSendPhoneOtp(phone) {
    var db = await getDB();
    var res = await db.auth.signInWithOtp({ phone: phone });
    if (res.error) throw res.error;
    return res.data;
}

async function authVerifyPhoneOtp(phone, token) {
    var db = await getDB();
    var res = await db.auth.verifyOtp({ phone: phone, token: token, type: 'sms' });
    if (res.error) throw res.error;
    return res.data;
}

async function authUpdatePhone(phone) {
    var db = await getDB();
    var res = await db.auth.updateUser({ phone: phone });
    if (res.error) throw res.error;
    return res.data;
}

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
    var profile = res.data || null;

    // If profile row exists but full_name is blank, pull it from auth user_metadata
    // This fixes cases where the profile row was created without a name
    if (profile && !profile.full_name) {
        var meta = (sess.user && sess.user.user_metadata) || {};
        var nameFromMeta = meta.full_name || meta.name || '';
        if (nameFromMeta) {
            profile.full_name = nameFromMeta;
            // Backfill the profiles table so it's fixed permanently
            await db.from('profiles').update({ full_name: nameFromMeta }).eq('id', sess.user.id);
        }
    }

    // If no profile row at all, build one from session data
    if (!profile && sess.user) {
        var meta = (sess.user.user_metadata) || {};
        profile = {
            id:        sess.user.id,
            email:     sess.user.email,
            full_name: meta.full_name || meta.name || '',
            dob:       meta.dob || null
        };
        // Create the missing profile row
        await db.from('profiles').upsert(profile, { onConflict: 'id' });
    }

    return profile;
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

// ─── TRACKING HELPERS ─────────────────────────────────
async function dbGetOrderTracking(orderId) {
    var db = await getDB();
    var res = await db.from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (res.error) return [];
    return res.data || [];
}

async function dbGetCurrentUserOrders() {
    var sess = await authGetSession();
    if (!sess) return [];
    return dbGetMyOrders(sess.user.id);
}

// Expose a stable API object used by auth.js, products.js, checkout.html and track.html.
window.WDG = window.WDG || {};
Object.assign(window.WDG, {
    getDB: getDB,

    authRegister: authRegister,
    authLogin: authLogin,
    authLogout: authLogout,
    authGetSession: authGetSession,
    authGetProfile: authGetProfile,
    authOnChange: authOnChange,
    authResetPassword: authResetPassword,
    authUpdatePassword: authUpdatePassword,
    authSendPhoneOtp: authSendPhoneOtp,
    authVerifyPhoneOtp: authVerifyPhoneOtp,
    authUpdatePhone: authUpdatePhone,

    productsGetAll: dbGetProducts,
    productsSave: dbSaveProduct,
    productsDelete: dbDeleteProduct,

    bannersGetActive: dbGetActiveBanner,
    bannersSet: dbSetBanner,
    bannersClear: dbClearBanner,

    categoriesGetAll: dbGetCategories,
    categoriesSave: dbSaveCategory,
    categoriesDelete: dbDeleteCategory,
    categoriesUpdate: dbUpdateCategory,

    ordersCreate: dbCreateOrder,
    ordersGetByRef: dbGetOrderByRef,
    ordersGetMine: dbGetCurrentUserOrders,
    ordersGetTracking: dbGetOrderTracking
});

// ─── WISHLIST ─────────────────────────────────────────

async function dbGetWishlist() {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) return [];
    var res = await db.from('wishlist')
        .select('*, products(*)')
        .eq('user_id', sess.user.id)
        .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}

async function dbAddToWishlist(productId) {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) throw new Error('Not logged in');
    // upsert so it never duplicates
    var res = await db.from('wishlist')
        .upsert({ user_id: sess.user.id, product_id: productId }, { onConflict: 'user_id,product_id' })
        .select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbRemoveFromWishlist(productId) {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) return;
    await db.from('wishlist').delete()
        .eq('user_id', sess.user.id)
        .eq('product_id', productId);
}

async function dbIsWishlisted(productId) {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) return false;
    var res = await db.from('wishlist')
        .select('id').eq('user_id', sess.user.id).eq('product_id', productId).maybeSingle();
    return !!(res.data);
}

// ─── REVIEWS (Supabase-persisted) ─────────────────────

async function dbGetReviews() {
    var db = await getDB();
    var res = await db.from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}

async function dbSubmitReview(reviewData) {
    var db = await getDB();
    var res = await db.from('reviews').insert(reviewData).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbRespondToReview(reviewId, responseText) {
    var db = await getDB();
    var res = await db.from('reviews')
        .update({ response: responseText, responded_at: new Date().toISOString() })
        .eq('id', reviewId).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbGetAllReviewsAdmin() {
    var db = await getDB();
    var res = await db.from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}

async function dbApproveReview(reviewId, approved) {
    var db = await getDB();
    var res = await db.from('reviews')
        .update({ approved: approved })
        .eq('id', reviewId);
    if (res.error) throw res.error;
}

// ─── HELPLINE / SUPPORT TICKETS ───────────────────────

async function dbSubmitSupportTicket(ticket) {
    var db = await getDB();
    var res = await db.from('support_tickets').insert(ticket).select().single();
    if (res.error) throw res.error;
    return res.data;
}

async function dbGetMyTickets() {
    var db = await getDB();
    var sess = await authGetSession();
    if (!sess) return [];
    var res = await db.from('support_tickets')
        .select('*')
        .eq('user_id', sess.user.id)
        .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}

async function dbGetAllTicketsAdmin() {
    var db = await getDB();
    var res = await db.from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
}

async function dbUpdateTicketStatus(ticketId, status, adminNote) {
    var db = await getDB();
    var update = { status: status };
    if (adminNote) update.admin_note = adminNote;
    var res = await db.from('support_tickets').update(update).eq('id', ticketId);
    if (res.error) throw res.error;
}

// Extend WDG object with new functions
Object.assign(window.WDG, {
    wishlistGet:        dbGetWishlist,
    wishlistAdd:        dbAddToWishlist,
    wishlistRemove:     dbRemoveFromWishlist,
    wishlistIsIn:       dbIsWishlisted,

    reviewsGet:         dbGetReviews,
    reviewsSubmit:      dbSubmitReview,
    reviewsRespond:     dbRespondToReview,
    reviewsGetAll:      dbGetAllReviewsAdmin,
    reviewsApprove:     dbApproveReview,

    supportSubmit:      dbSubmitSupportTicket,
    supportGetMine:     dbGetMyTickets,
    supportGetAll:      dbGetAllTicketsAdmin,
    supportUpdateStatus:dbUpdateTicketStatus
});
