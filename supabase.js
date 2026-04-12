/* ═══════════════════════════════════════════════════════════
   WORTHDAGIVE — supabase.js
   Centralised Supabase client + all backend API helpers.

   SETUP (one-time):
   1. Create a free project at https://supabase.com
   2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with
      the values from Project Settings → API.
   3. Run the SQL schema in supabase_schema.sql inside the
      Supabase SQL editor to create all required tables.
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://tndsmvsuowqdmhtatmie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHNtdnN1b3dxZG1odGF0bWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM0MjAsImV4cCI6MjA5MDkwOTQyMH0.KLd3B-MQI1BBJSg98lfFugnqPDqeBBBGuM-cRbI0Eyw';

/* ── Load Supabase JS SDK from CDN ── */
async function loadSupabaseSDK() {
    if (window._supabaseClient) return window._supabaseClient;
    return new Promise((resolve, reject) => {
        if (document.getElementById('supabase-sdk')) {
            waitForSupabase(resolve, reject);
            return;
        }
        const s = document.createElement('script');
        s.id  = 'supabase-sdk';
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload  = () => waitForSupabase(resolve, reject);
        s.onerror = () => reject(new Error('Failed to load Supabase SDK'));
        document.head.appendChild(s);
    });
}

function waitForSupabase(resolve, reject, attempts = 0) {
    if (window.supabase && window.supabase.createClient) {
        window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        resolve(window._supabaseClient);
    } else if (attempts > 50) {
        reject(new Error('Supabase SDK timeout'));
    } else {
        setTimeout(() => waitForSupabase(resolve, reject, attempts + 1), 100);
    }
}

async function db() {
    return loadSupabaseSDK();
}

async function getProducts() {
    const client = await db();
    const { data, error } = await client
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    return data;
}

// make it globally available
window.WDG = window.WDG || {};
window.WDG.getProducts = getProducts;

/* ════════════════════════════════════════
   AUTH
════════════════════════════════════════ */

/** Register a new user with email/password and save profile */
async function authRegister({ email, password, fullName, dob }) {
    const client = await db();
    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin + '/verify.html',
            data: { full_name: fullName, dob }
        }
    });
    if (error) throw error;

    /* Insert into profiles table after sign-up */
    if (data.user) {
        await client.from('profiles').upsert({
            id:        data.user.id,
            full_name: fullName,
            dob,
            email
        });
    }
    return data;
}

/** Log in an existing user */
async function authLogin({ email, password }) {
    const client = await db();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

/** Log out current user */
async function authLogout() {
    const client = await db();
    const { error } = await client.auth.signOut();
    if (error) throw error;
}

/** Get current session (null if not logged in) */
async function authGetSession() {
    const client = await db();
    const { data } = await client.auth.getSession();
    return data.session;
}

/** Get current user profile from profiles table */
async function authGetProfile() {
    const client  = await db();
    const session = await authGetSession();
    if (!session) return null;
    const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    if (error) return null;
    return data;
}

/** Listen for auth state changes */
async function authOnChange(callback) {
    const client = await db();
    client.auth.onAuthStateChange((_event, session) => callback(session));
}

/* ════════════════════════════════════════
   ORDERS
════════════════════════════════════════ */

/** Create a new order — returns the created order row */
async function ordersCreate(orderData) {
    const client  = await db();
    const session = await authGetSession();
    const payload = {
        ...orderData,
        user_id:    session ? session.user.id : null,
        status:     'pending',
        created_at: new Date().toISOString()
    };
    const { data, error } = await client
        .from('orders')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Get all orders for the currently logged-in user */
async function ordersGetMine() {
    const client  = await db();
    const session = await authGetSession();
    if (!session) return [];
    const { data, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

/** Get a single order by reference number (for tracking page) */
async function ordersGetByRef(ref) {
    const client = await db();
    const { data, error } = await client
        .from('orders')
        .select('*, order_items(*), order_tracking(*)')
        .eq('ref', ref)
        .single();
    if (error) throw error;
    return data;
}

/** Get tracking history for an order */
async function ordersGetTracking(orderId) {
    const client = await db();
    const { data, error } = await client
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

/* ════════════════════════════════════════
   PRODUCTS (admin)
════════════════════════════════════════ */

/** Fetch all products from Supabase (merges with base catalogue) */
async function productsGetAll() {
    const client = await db();
    const { data, error } = await client
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
}

/** Upsert a product (admin only) */
async function productsSave(product) {
    const client = await db();
    const { data, error } = await client
        .from('products')
        .upsert(product)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Delete a product (admin only) */
async function productsDelete(id) {
    const client = await db();
    const { error } = await client
        .from('products')
        .update({ active: false })
        .eq('id', id);
    if (error) throw error;
}

/* ════════════════════════════════════════
   BANNERS (admin)
════════════════════════════════════════ */

async function bannersGetActive() {
    const client = await db();
    const { data } = await client
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
}

async function bannersSave(banner) {
    const client = await db();
    /* Deactivate all existing banners first */
    await client.from('banners').update({ active: false }).neq('id', 0);
    const { data, error } = await client
        .from('banners')
        .insert({ ...banner, active: true })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/* ════════════════════════════════════════
   EXPORTS — attach to window for global access
════════════════════════════════════════ */
window.WDG = {
    /* Auth */
    authRegister, authLogin, authLogout,
    authGetSession, authGetProfile, authOnChange,
    /* Orders */
    ordersCreate, ordersGetMine, ordersGetByRef, ordersGetTracking,
    /* Products */
    productsGetAll, productsSave, productsDelete,
    /* Banners */
    bannersGetActive, bannersSave
};
