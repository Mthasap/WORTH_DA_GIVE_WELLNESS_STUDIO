/* ═══════════════════════════════════════════════════
   WORTHDAGIVE — supabase.js
   Supabase client + all backend API helpers.

   SETUP:
   1. Create a free project at https://supabase.com
   2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
      with values from Project Settings > API.
   3. Run supabase_schema.sql in the Supabase SQL editor.
   Until configured, all functions fall back gracefully.
═══════════════════════════════════════════════════ */

var SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
var SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

var _sbClient = null;

function loadSupabaseSDK() {
    return new Promise(function(resolve, reject) {
        if (_sbClient) { resolve(_sbClient); return; }
        if (SUPABASE_URL.indexOf('YOUR_PROJECT') !== -1) {
            resolve(null); return; // Not configured yet
        }
        if (window._supabase) {
            _sbClient = window._supabase;
            resolve(_sbClient);
            return;
        }
        var existing = document.getElementById('sb-sdk');
        if (existing) {
            waitForSB(resolve, reject, 0);
            return;
        }
        var s = document.createElement('script');
        s.id  = 'sb-sdk';
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload  = function() { waitForSB(resolve, reject, 0); };
        s.onerror = function() { resolve(null); }; // Fail gracefully
        document.head.appendChild(s);
    });
}

function waitForSB(resolve, reject, attempts) {
    if (window.supabase && window.supabase.createClient) {
        _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window._supabase = _sbClient;
        resolve(_sbClient);
    } else if (attempts > 50) {
        resolve(null);
    } else {
        setTimeout(function() { waitForSB(resolve, reject, attempts + 1); }, 100);
    }
}

async function getDB() { return loadSupabaseSDK(); }

/* ── AUTH ── */
async function authRegister(opts) {
    var client = await getDB();
    if (!client) throw new Error('Supabase not configured');
    var result = await client.auth.signUp({
        email: opts.email,
        password: opts.password,
        options: { data: { full_name: opts.fullName, dob: opts.dob } }
    });
    if (result.error) throw result.error;
    if (result.data.user) {
        await client.from('profiles').upsert({
            id: result.data.user.id,
            full_name: opts.fullName,
            dob: opts.dob,
            email: opts.email
        });
    }
    return result.data;
}

async function authLogin(opts) {
    var client = await getDB();
    if (!client) throw new Error('Supabase not configured');
    var result = await client.auth.signInWithPassword({ email: opts.email, password: opts.password });
    if (result.error) throw result.error;
    return result.data;
}

async function authLogout() {
    var client = await getDB();
    if (!client) return;
    await client.auth.signOut();
}

async function authGetSession() {
    var client = await getDB();
    if (!client) return null;
    var result = await client.auth.getSession();
    return result.data ? result.data.session : null;
}

async function authGetProfile() {
    var client  = await getDB();
    if (!client) return null;
    var session = await authGetSession();
    if (!session) return null;
    var result  = await client.from('profiles').select('*').eq('id', session.user.id).single();
    return result.data || null;
}

async function authOnChange(callback) {
    var client = await getDB();
    if (!client) return;
    client.auth.onAuthStateChange(function(_event, session) { callback(session); });
}

/* ── ORDERS ── */
async function ordersCreate(orderData) {
    var client  = await getDB();
    if (!client) throw new Error('Supabase not configured');
    var session = await authGetSession();
    var payload = Object.assign({}, orderData, {
        user_id:    session ? session.user.id : null,
        status:     'pending',
        created_at: new Date().toISOString()
    });
    var result = await client.from('orders').insert(payload).select().single();
    if (result.error) throw result.error;
    return result.data;
}

async function ordersGetMine() {
    var client  = await getDB();
    if (!client) return [];
    var session = await authGetSession();
    if (!session) return [];
    var result  = await client.from('orders').select('*, order_items(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });
    return result.data || [];
}

async function ordersGetByRef(ref) {
    var client = await getDB();
    if (!client) throw new Error('Supabase not configured');
    var result  = await client.from('orders').select('*, order_items(*), order_tracking(*)').eq('ref', ref).single();
    if (result.error) throw result.error;
    return result.data;
}

async function ordersGetTracking(orderId) {
    var client = await getDB();
    if (!client) return [];
    var result  = await client.from('order_tracking').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    return result.data || [];
}

/* ── EXPOSE GLOBALLY ── */
window.WDG = {
    authRegister:    authRegister,
    authLogin:       authLogin,
    authLogout:      authLogout,
    authGetSession:  authGetSession,
    authGetProfile:  authGetProfile,
    authOnChange:    authOnChange,
    ordersCreate:    ordersCreate,
    ordersGetMine:   ordersGetMine,
    ordersGetByRef:  ordersGetByRef,
    ordersGetTracking: ordersGetTracking
};
