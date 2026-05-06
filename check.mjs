import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.replace(/"/g, '')?.trim();
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.replace(/"/g, '')?.trim();

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('store_inventory').select('*').limit(1);
  if (data?.[0]) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
  } else {
    console.error('Error or no data:', error);
  }
}
check();
