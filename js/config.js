// Wklej tutaj swoje dane z Supabase.
// UWAGA: URL ma być bez /rest/v1 na końcu.
const SUPABASE_URL = "TU_WKLEJ_SUPABASE_URL";
const SUPABASE_KEY = "TU_WKLEJ_PUBLISHABLE_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
