const { createClient } = require('@supabase/supabase-js');
const { config, requireEnv } = require('./config');

let client;

function getSupabase() {
  if (!client) {
    requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return client;
}

module.exports = { getSupabase };
