// ─────────────────────────────────────────
//  WORTHDAGIVE — SUPABASE CONFIG (CLEAN)
// ─────────────────────────────────────────

// ⚠️ MAKE SURE THIS FILE IS LOADED ONLY ONCE

const SUPABASE_URL = "https://tndsmvsuowqdmhtatmie.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHNtdnN1b3dxZG1odGF0bWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM0MjAsImV4cCI6MjA5MDkwOTQyMH0.KLd3B-MQI1BBJSg98lfFugnqPDqeBBBGuM-cRbI0Eyw";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Optional wrapper (for future scaling)
const WDG = {
    getProducts: async () => {
        const { data, error } = await supabase.from('products').select('*');

        if (error) {
            console.error("Supabase error:", error);
            return [];
        }

        return data || [];
    }
};

window.WDG = WDG;
