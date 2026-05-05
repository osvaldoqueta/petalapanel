/**
 * useAuditLog — Registra alterações administrativas na tabela app_logs.
 *
 * Cada ação feita no painel (ex: mudar cor do app, toggle flash sale)
 * gera um registro de auditoria com user_id, action, old/new values.
 */
import { useCallback } from 'react'
import { supabaseAdmin } from '@/integrations/supabase/admin'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { AuditLog } from '@/shared/types'

export function useAuditLog() {
  const { profile } = useAuth()

  const log = useCallback(async (entry: Omit<AuditLog, 'id' | 'user_id' | 'created_at'>) => {
    if (!profile?.id) {
      console.warn('[AuditLog] No user profile — skipping log')
      return
    }

    const payload: AuditLog = {
      user_id: profile.id,
      action: entry.action,
      table_name: entry.table_name,
      record_key: entry.record_key,
      old_value: entry.old_value,
      new_value: entry.new_value,
    }

    const { error } = await supabaseAdmin
      .from('app_logs')
      .insert(payload)

    if (error) {
      console.error('[AuditLog] Failed to write audit log:', error.message)
    }
  }, [profile])

  return { log }
}
