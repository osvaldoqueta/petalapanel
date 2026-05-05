/**
 * DesignSystemPage — Interface para gerenciar a tabela app_config.
 * Permite alterar variáveis CSS do app principal via painel.
 * Cada alteração grava um log de auditoria.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseAdmin } from '@/integrations/supabase/admin'
import { useAuditLog } from '@/hooks/useAuditLog'
import { ConfigRow } from '@/modules/design-system/components/ConfigRow'
import { TableSkeleton } from '@/components/Skeleton'
import { Palette, Search, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AppConfigRow } from '@/shared/types'

export default function DesignSystemPage() {
  const queryClient = useQueryClient()
  const { log } = useAuditLog()
  const [search, setSearch] = useState('')

  const { data: configs, isLoading, isRefetching } = useQuery<AppConfigRow[]>({
    queryKey: ['admin-app-config'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin
        .from('app_config')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error
      return data as AppConfigRow[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleSave = async (key: string, newValue: string, oldValue: string) => {
    const { error } = await supabaseAdmin
      .from('app_config')
      .update({ value: newValue })
      .eq('key', key)

    if (error) {
      console.error('[DesignSystem] Failed to update config:', error.message)
      return
    }

    // Audit log
    await log({
      action: 'UPDATE',
      table_name: 'app_config',
      record_key: key,
      old_value: oldValue,
      new_value: newValue,
    })

    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ['admin-app-config'] })
  }

  const filtered = (configs || []).filter(
    (c) => c.key.toLowerCase().includes(search.toLowerCase()) ||
           c.value.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Design System Control</h1>
              <p className="text-sm text-surface-400 mt-0.5">
                Gerencie as variáveis globais do aplicativo Pétala
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-app-config'] })}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium',
            'glass text-surface-400 hover:text-white transition-all',
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar configuração..."
          className={cn(
            'w-full rounded-xl border bg-surface-950/50 pl-10 pr-4 py-2.5 text-sm text-white',
            'placeholder:text-surface-500 border-surface-800',
            'focus:border-petala-500/50 focus:ring-1 focus:ring-petala-500/30 outline-none transition-all'
          )}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={3} />
      ) : (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800/50">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">
                  Chave
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">
                  Valor
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-surface-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <p className="text-sm text-surface-500">Nenhuma configuração encontrada</p>
                  </td>
                </tr>
              ) : (
                filtered.map((config) => (
                  <ConfigRow key={config.key} config={config} onSave={handleSave} />
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-surface-800/30 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-surface-500">
              {filtered.length} de {configs?.length ?? 0} configurações
            </p>
            <p className="text-[10px] text-surface-600">
              Alterações são registradas automaticamente em <code className="text-petala-400/50">app_logs</code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
