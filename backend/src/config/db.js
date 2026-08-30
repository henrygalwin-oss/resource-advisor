'use strict';

const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

// Resilient clean-up: strip any trailing '/rest/v1/' or '/rest/v1' or trailing slash
// Supabase JS SDK internally appends '/rest/v1', so providing a URL with it causes double-append errors (PGRST125)
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
