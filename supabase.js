const SUPABASE_URL      = 'https://tndsmvsuowqdmhtatmie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHNtdnN1b3dxZG1odGF0bWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM0MjAsImV4cCI6MjA5MDkwOTQyMH0.KLd3B-MQI1BBJSg98lfFugnqPDqeBBBGuM-cRbI0Eyw';

// ─────────────────────────────────────────
// LOAD SUPABASE SDK
// ─────────────────────────────────────────
async function loadSupabaseSDK() {
    if (window._supabaseClient) return window._supabaseClient;

    return new Promise((resolve, reject) => {
        if (window.supabase) {
            window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            resolve(window._supabaseClient);
            return;
        }

        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

        s.onload = () => {
            window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            resolve(window._supabaseClient);
        };

        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function db() {
    return await loadSupabaseSDK();
}

// ─────────────────────────────────────────
// ✅ FIXED PRODUCTS FUNCTION
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// AUTH (UNCHANGED)
// ─────────────────────────────────────────
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

    if (data.user) {
        await client.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            dob,
            email
        });
    }
    return data;
}

async function authLogin({ email, password }) {
    const client = await db();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function authLogout() {
    const client = await db();
    const { error } = await client.auth.signOut();
    if (error) throw error;
}

async function authGetSession() {
    const client = await db();
    const { data } = await client.auth.getSession();
    return data.session;
}

async function authGetProfile() {
    const client = await db();
    const session = await authGetSession();
    if (!session) return null;

    const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    return data;
}

async function authOnChange(callback) {
    const client = await db();
    client.auth.onAuthStateChange((_event, session) => callback(session));
}

// ─────────────────────────────────────────
// PRODUCTS (ADMIN)
// ─────────────────────────────────────────
async function productsGetAll() {
    return await getProducts(); // reuse main function
}

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

async function productsDelete(id) {
    const client = await db();
    const { error } = await client
        .from('products')
        .update({ active: false })
        .eq('id', id);

    if (error) throw error;
}

// ─────────────────────────────────────────
// ✅ FINAL EXPORT (FIXED — NO OVERRITING)
// ─────────────────────────────────────────
window.WDG = {
    getProducts, // ✅ THIS FIXES YOUR ERROR
    authRegister,
    authLogin,
    authLogout,
    authGetSession,
    authGetProfile,
    authOnChange,
    productsGetAll,
    productsSave,
    productsDelete
};
