// Wklej tutaj swoje dane z Supabase.
// WAŻNE: URL ma być bez /rest/v1/
const SUPABASE_URL = "https://zwgzlcvrtvcjceihyfhd.supabase.co";
const SUPABASE_KEY = "sb_publishable_WSOj70lq6-pvTXoA3nDgTQ_LnqfgT-N";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
