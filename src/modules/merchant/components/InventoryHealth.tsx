/**
 * InventoryHealth — Monitoramento de status de moderação dos vídeos da loja.
 * Mostra barra de progresso: aprovados / pendentes / rejeitados.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { TableSkeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react'

interface InventoryHealthProps {
  storeId: string | null
}

interface HealthStats {
  total: number
  approved: number
  pending: number
  rejected: number
}

export function InventoryHealth({ storeId }: InventoryHealthProps) {
  const { data: stats, isLoading } = useQuery<HealthStats>({
    queryKey: ['inventory-health', storeId],
    queryFn: async () => {
      let query = supabase
        .from('store_inventory')
        .select('video_moderation_status')
        .not('video_url', 'is', null)

      if (storeId) {
        query = query.eq('store_id', storeId)
      }

      const { data: items } = await query

      const total = items?.length || 0
      const approved = items?.filter(i => i.video_moderation_status === 'approved').length || 0
      const pending = items?.filter(i => i.video_moderation_status === 'pending').length || 0
      const rejected = items?.filter(i => i.video_moderation_status === 'rejected').length || 0

      return { total, approved, pending, rejected }
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <TableSkeleton rows={3} cols={2} />

  const total = stats?.total || 0
  const pctApproved = total > 0 ? (stats!.approved / total) * 100 : 0
  const pctPending = total > 0 ? (stats!.pending / total) * 100 : 0
  const pctRejected = total > 0 ? (stats!.rejected / total) * 100 : 0

  const segments = [
    { label: 'Aprovados', count: stats?.approved || 0, pct: pctApproved, color: 'bg-petala-500', textColor: 'text-petala-400', icon: CheckCircle },
    { label: 'Pendentes', count: stats?.pending || 0, pct: pctPending, color: 'bg-accent-amber', textColor: 'text-accent-amber', icon: Clock },
    { label: 'Rejeitados', count: stats?.rejected || 0, pct: pctRejected, color: 'bg-accent-rose', textColor: 'text-accent-rose', icon: AlertTriangle },
  ]

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-surface-800/30 flex items-center gap-3">
        <Package className="h-5 w-5 text-accent-purple" />
        <div>
          <h3 className="text-sm font-semibold text-white">Saúde do Inventário</h3>
          <p className="text-xs text-surface-500 mt-0.5">{total} vídeos de produtos cadastrados</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Package className="h-10 w-10 text-surface-600 mb-3" />
          <p className="text-sm text-surface-400">Nenhum vídeo cadastrado</p>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Progress bar */}
          <div className="h-3 rounded-full bg-surface-800 overflow-hidden flex">
            {segments.map(s => s.pct > 0 && (
              <div
                key={s.label}
                className={cn('h-full transition-all duration-500', s.color)}
                style={{ width: `${s.pct}%` }}
              />
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            {segments.map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Icon className={cn('h-3.5 w-3.5', s.textColor)} />
                    <span className={cn('text-lg font-bold', s.textColor)}>{s.count}</span>
                  </div>
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xs text-surface-400 font-mono">{s.pct.toFixed(1)}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
