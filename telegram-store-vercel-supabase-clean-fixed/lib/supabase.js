const { config } = require('./config');

let client;

function getSupabase() {
  if (!client) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY wajib diisi.');
    }
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
