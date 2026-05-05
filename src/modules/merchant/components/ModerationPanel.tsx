/**
 * ModerationPanel — Pétala Safety Shield moderation view.
 */
import { useQuery } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { TableSkeleton } from '@/components/Skeleton'
import { cn, formatRelativeDate } from '@/lib/utils'
import { Shield, AlertTriangle, CheckCircle, Clock, Video } from 'lucide-react'

interface ModerationItem {
  id: string; name: string; video_url: string; image_url: string | null
  video_moderation_status: string | null; video_moderation_reason: string | null
  store_name: string; created_at: string
}

export function ModerationPanel({ storeId }: { storeId?: string | null }) {
  const { data: items, isLoading } = useQuery<ModerationItem[]>({
    queryKey: ['admin-moderation', storeId],
    queryFn: () => merchantRepository.getModerationItems(storeId || null),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <TableSkeleton rows={5} cols={4} />

  const statusBadge = (s: string | null) => {
    if (s === 'pending') return { text: 'Pendente', cls: 'bg-accent-amber/10 text-accent-amber' }
    if (s === 'rejected') return { text: 'Rejeitado', cls: 'bg-accent-rose/10 text-accent-rose' }
    return { text: s || '?', cls: 'bg-surface-800 text-surface-500' }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-surface-800/30 flex items-center gap-3">
        <Shield className="h-5 w-5 text-accent-amber" />
        <div>
          <h3 className="text-sm font-semibold text-white">Safety Shield — Moderação</h3>
          <p className="text-xs text-surface-500 mt-0.5">{items?.length ?? 0} vídeos pendentes/rejeitados</p>
        </div>
      </div>
      {(!items || items.length === 0) ? (
        <div className="flex flex-col items-center py-16">
          <CheckCircle className="h-10 w-10 text-petala-400 mb-3" />
          <p className="text-sm text-white font-medium">Tudo limpo!</p>
          <p className="text-xs text-surface-500">Nenhum vídeo pendente.</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-800/20">
          {items.map((item) => {
            const badge = statusBadge(item.video_moderation_status)
            return (
              <div key={item.id} className="flex items-start gap-4 p-4 hover:bg-surface-800/20 transition-colors">
                <div className="relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-800">
                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center"><Video className="h-6 w-6 text-surface-600" /></div>}
                  <div className="absolute top-1 left-1">{item.video_moderation_status === 'pending' ? <Clock className="h-4 w-4 text-accent-amber" /> : <AlertTriangle className="h-4 w-4 text-accent-rose" />}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', badge.cls)}>{badge.text}</span>
                  </div>
                  <p className="text-xs text-surface-400">{item.store_name} · {formatRelativeDate(item.created_at)}</p>
                  {item.video_moderation_reason && (
                    <div className="mt-2 rounded-lg bg-accent-rose/5 border border-accent-rose/10 p-2">
                      <p className="text-xs text-red-300"><AlertTriangle className="inline h-3 w-3 mr-1" />{item.video_moderation_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
