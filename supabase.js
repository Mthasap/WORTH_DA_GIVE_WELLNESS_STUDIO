const SUPABASE_URL      = 'https://tndsmvsuowqdmhtatmie.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_KEY_HERE'; // keep yours

// ─────────────────────────────────────────
// LOAD SDK
// ─────────────────────────────────────────
async function loadSupabaseSDK() {
    if (window._supabaseClient) return window._supabaseClient;

    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
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
// PRODUCTS (MAIN FIX)
// ─────────────────────────────────────────
async function getProducts() {
    const client = await db();

    const { data, error } = await client
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}

// ─────────────────────────────────────────
// EXPORT ALL (IMPORTANT FIX)
// ─────────────────────────────────────────
window.WDG = {
    getProducts // ✅ THIS WAS MISSING BEFORE
};
