import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

async function run() {
  const { data, error } = await supabase.from('store_inventory').select('*').limit(1);
  console.log(JSON.stringify(data?.[0]));
  if (error) console.error(error);
}

run();
