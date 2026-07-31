// Backend configuration. With both values filled in, the app requires sign-in
// and stores each user's data in Supabase (cloud mode). Left empty, it runs in
// local mode: no accounts, data in this browser's localStorage.
//
// Get these from supabase.com → your project → Settings → API:
//   Project URL  → SUPABASE_URL
//   anon public  → SUPABASE_ANON_KEY   (safe to ship in frontend code)
window.CONFIG = {
  SUPABASE_URL: "https://irytcbztrgvbwtqgcbvh.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_xM1LODZuCgfjOhbunG0FbA_FJ1j_gYa",
};
