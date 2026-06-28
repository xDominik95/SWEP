// Wklej tutaj swoje dane z Supabase.
// WAŻNE: URL ma być bez /rest/v1/
const SUPABASE_URL = "https://zwgzlcvrtvcjceihyfhd.supabase.co";
const SUPABASE_KEY = "TU_WKLEJ_PUBLISHABLE_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
