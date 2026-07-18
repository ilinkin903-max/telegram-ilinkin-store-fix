const { config, requireEnv } = require('./config');

let client;

function getSupabase() {
  if (!client) {
    requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    // Lazy require membuat helper murni (promo/tanggal) tetap bisa dites tanpa
    // menginisialisasi koneksi Supabase. Saat runtime Vercel dependency tetap wajib ada.
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return client;
}

module.exports = { getSupabase };
