/**
 * Supabase Admin Client — usa SERVICE_ROLE_KEY para bypass de RLS.
 * ⚠️ NUNCA expor este client em bundles públicos sem proteção.
 * Em produção, a chave é injetada via Vercel Environment Variables.
 *
 * Uso exclusivo para:
 *  - Alterações em app_config (Design System Control)
 *  - Gravação de audit logs (app_logs)
 *  - Leitura cross-user de dados administrativos
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase Admin] SERVICE_ROLE_KEY not set — admin operations will fail')
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_URL, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
