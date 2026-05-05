/**
 * DesignSystemPage — Central de governança visual do ecossistema Pétala.
 * Seção 1: Temas Sazonais (app_themes) — cores, radius, override.
 * Seção 2: Feature Flags (app_config) — flash sale, manutenção, etc.
 * Seção 3: Configurações Gerais (app_config) — AI model, strings, etc.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseAdmin } from '@/integrations/supabase/admin'
import { useAuditLog } from '@/hooks/useAuditLog'
import { ThemeCard } from '@/modules/design-system/components/ThemeCard'
import { FeatureFlagRow } from '@/modules/design-system/components/FeatureFlagRow'
import { ConfigRow } from '@/modules/design-system/components/ConfigRow'
import { TableSkeleton, ThemeCardSkeleton } from '@/components/Skeleton'
import { Palette, Search, RefreshCw, ToggleRight, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AppConfigRow, AppTheme } from '@/shared/types'

const FEATURE_FLAG_KEYS = ['flash_sale_active', 'maintenance_mode', 'welcome_banner']

export default function DesignSystemPage() {
  const queryClient = useQueryClient()
  const { log } = useAuditLog()
  const [search, setSearch] = useState('')

  // ─── Themes ──────────────────────────────────────────────
  const { data: themes, isLoading: themesLoading } = useQuery<AppTheme[]>({
    queryKey: ['admin-app-themes'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin
        .from('app_themes')
        .select('*')
        .order('season_name')
      if (error) throw error
      return data as AppTheme[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleThemeSave = async (id: string, updates: Partial<AppTheme>) => {
    // If activating override, deactivate all others first
    if (updates.is_active_override) {
      await supabaseAdmin
        .from('app_themes')
        .update({ is_active_override: false } as never)
        .neq('id', id)
    }

    const { error } = await supabaseAdmin
      .from('app_themes')
      .update(updates as never)
      .eq('id', id)

    if (error) {
      toast.error(`Erro ao salvar tema: ${error.message}`)
      return
    }

    await log({
      action: 'UPDATE',
      table_name: 'app_themes',
      record_key: id,
      old_value: null,
      new_value: JSON.stringify(updates),
    })

    toast.success('Tema atualizado! O app principal refletirá a mudança em tempo real.')
    queryClient.invalidateQueries({ queryKey: ['admin-app-themes'] })
  }

  // ─── Config (Flags + General) ────────────────────────────
  const { data: configs, isLoading: configsLoading, isRefetching } = useQuery<AppConfigRow[]>({
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

  const handleConfigSave = async (key: string, newValue: string, oldValue: string) => {
    const { error } = await supabaseAdmin
      .from('app_config')
      .update({ value: newValue })
      .eq('key', key)

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
      return
    }

    await log({
      action: 'UPDATE',
      table_name: 'app_config',
      record_key: key,
      old_value: oldValue,
      new_value: newValue,
    })

    toast.success(`Configuração "${key}" atualizada.`)
    queryClient.invalidateQueries({ queryKey: ['admin-app-config'] })
  }

  const flagConfigs = (configs || []).filter(c => FEATURE_FLAG_KEYS.includes(c.key))
  const generalConfigs = (configs || []).filter(c => !FEATURE_FLAG_KEYS.includes(c.key))
  const filteredGeneral = generalConfigs.filter(
    c => c.key.toLowerCase().includes(search.toLowerCase()) ||
         c.value.toLowerCase().includes(search.toLowerCase())
  )

  const isLoading = themesLoading || configsLoading

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Design System Control</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              Governança visual centralizada do ecossistema Pétala
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-app-themes'] })
            queryClient.invalidateQueries({ queryKey: ['admin-app-config'] })
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium',
            'glass text-surface-400 hover:text-white transition-all',
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* ─── Section 1: Temas Sazonais ──────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-accent-purple" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Temas Sazonais</h2>
          <span className="text-[10px] text-surface-500 bg-surface-800/50 px-2 py-0.5 rounded-full">
            Realtime → app_themes
          </span>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThemeCardSkeleton />
            <ThemeCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(themes || []).map(theme => (
              <ThemeCard key={theme.id} theme={theme} onSave={handleThemeSave} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Section 2: Feature Flags ───────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleRight className="h-4 w-4 text-petala-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Feature Flags</h2>
        </div>
        {isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : (
          <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-800/30 animate-fade-in">
            {flagConfigs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-surface-500">
                  Nenhuma feature flag encontrada. Adicione chaves como <code className="text-petala-400/60">flash_sale_active</code> na tabela <code className="text-petala-400/60">app_config</code>.
                </p>
              </div>
            ) : (
              flagConfigs.map(config => (
                <FeatureFlagRow
                  key={config.key}
                  configKey={config.key}
                  value={config.value}
                  onToggle={handleConfigSave}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* ─── Section 3: Configurações Gerais ────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-accent-amber" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Configurações Gerais</h2>
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
                {filteredGeneral.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <p className="text-sm text-surface-500">Nenhuma configuração encontrada</p>
                    </td>
                  </tr>
                ) : (
                  filteredGeneral.map((config) => (
                    <ConfigRow key={config.key} config={config} onSave={handleConfigSave} />
                  ))
                )}
              </tbody>
            </table>
            <div className="border-t border-surface-800/30 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-surface-500">
                {filteredGeneral.length} de {generalConfigs.length} configurações
              </p>
              <p className="text-[10px] text-surface-600">
                Alterações são registradas automaticamente em <code className="text-petala-400/50">app_logs</code>
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
