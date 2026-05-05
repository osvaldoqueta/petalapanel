/**
 * Supabase Auth Client — usa ANON KEY para autenticação com RLS.
 * Todas as queries de usuário comum passam por aqui.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
})
