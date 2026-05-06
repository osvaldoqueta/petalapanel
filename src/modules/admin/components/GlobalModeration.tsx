/**
 * GlobalModeration — Fila global de moderação de vídeos.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRepository } from '@/repositories/adminRepository'
import { useAuditLog } from '@/hooks/useAuditLog'
import { ModerationCardSkeleton } from '@/components/Skeleton'
import { formatRelativeDate, formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ModerationItem } from '@/shared/types'
import { Shield, CheckCircle, XCircle, Play, AlertTriangle, Inbox, Send } from 'lucide-react'

export function GlobalModeration() {
  const { log } = useAuditLog()
  const qc = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const { data: queue = [], isLoading } = useQuery<ModerationItem[]>({
    queryKey: ['moderation-queue'],
    queryFn: adminRepository.getModerationQueue,
    staleTime: 30_000,
  })

  const handleApprove = async (item: ModerationItem) => {
    setProcessingId(item.id)
    try {
      await adminRepository.approveVideo(item.id)
      await log({ action: 'video_approve', table_name: 'store_inventory', record_key: item.id, old_value: 'pending', new_value: 'approved', entity: 'store_inventory', store_id: item.store_id })
      if (item.store_owner_id) {
        await adminRepository.sendNotification(item.store_owner_id, '✅ Vídeo Aprovado', `Seu vídeo do produto "${item.name}" foi aprovado.`, 'success', '/marketplace')
      }
      toast.success(`Vídeo "${item.name}" aprovado`)
      qc.invalidateQueries({ queryKey: ['moderation-queue'] })
    } catch (err: any) { toast.error(err?.message || 'Erro') } finally { setProcessingId(null) }
  }

  const handleReject = async (item: ModerationItem) => {
    if (!rejectReason.trim()) { toast.error('Informe o motivo'); return }
    setProcessingId(item.id)
    try {
      await adminRepository.rejectVideo(item.id, rejectReason.trim())
      await log({ action: 'video_reject', table_name: 'store_inventory', record_key: item.id, old_value: item.video_moderation_status, new_value: `rejected: ${rejectReason.trim()}`, entity: 'store_inventory', store_id: item.store_id })
      if (item.store_owner_id) {
        await adminRepository.sendNotification(item.store_owner_id, '⚠️ Vídeo Rejeitado', `Seu vídeo "${item.name}" foi rejeitado. Motivo: ${rejectReason.trim()}`, 'warning', '/merchant')
      }
      toast.success(`Vídeo "${item.name}" rejeitado`)
      setRejectingId(null); setRejectReason('')
      qc.invalidateQueries({ queryKey: ['moderation-queue'] })
    } catch (err: any) { toast.error(err?.message || 'Erro') } finally { setProcessingId(null) }
  }

  const pendingCount = queue.filter(q => q.video_moderation_status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="glass p-4 rounded-2xl flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-amber/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-accent-amber" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Moderação Global</h2>
          <p className="text-xs text-surface-400">{pendingCount} vídeo{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <ModerationCardSkeleton key={i} />)}</div>
      ) : queue.length === 0 ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center text-center animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-petala-500/10 flex items-center justify-center mb-4"><Inbox className="h-8 w-8 text-petala-400" /></div>
          <p className="text-lg font-bold text-white">Fila vazia</p>
          <p className="text-sm text-surface-400 mt-1">Todos os vídeos foram revisados 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          {queue.map((item) => (
            <div key={item.id} className={cn('glass rounded-2xl overflow-hidden', item.video_moderation_status === 'rejected' && 'ring-1 ring-accent-rose/30')}>
              <div className="relative aspect-video bg-surface-900 flex items-center justify-center">
                {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover opacity-60" /> : <div className="w-full h-full bg-surface-800 flex items-center justify-center"><Play className="h-8 w-8 text-surface-500" /></div>}
                <div className="absolute inset-0 flex items-center justify-center">
                  <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"><Play className="h-5 w-5 text-white fill-white" /></a>
                </div>
                <span className={cn('absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full', item.video_moderation_status === 'pending' ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-rose/20 text-accent-rose')}>
                  {item.video_moderation_status === 'pending' ? 'Pendente' : 'Rejeitado'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3><p className="text-xs text-surface-400">{item.store_name} · {formatCurrency(item.price)}</p></div>
                  <span className="text-[10px] text-surface-500 flex-shrink-0">{formatRelativeDate(item.created_at)}</span>
                </div>
                {item.video_moderation_status === 'rejected' && item.video_moderation_reason && (
                  <div className="flex items-start gap-2 bg-accent-rose/5 border border-accent-rose/15 rounded-xl p-3"><AlertTriangle className="h-4 w-4 text-accent-rose flex-shrink-0 mt-0.5" /><p className="text-xs text-accent-rose/80">{item.video_moderation_reason}</p></div>
                )}
                {rejectingId === item.id ? (
                  <div className="space-y-2 animate-fade-in">
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motivo da rejeição (obrigatório)..." rows={2} autoFocus maxLength={300} className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-accent-rose transition-all resize-none" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setRejectingId(null); setRejectReason('') }} className="flex-1 text-xs text-surface-400 hover:text-white py-2 rounded-lg transition-colors">Cancelar</button>
                      <button onClick={() => handleReject(item)} disabled={processingId === item.id || !rejectReason.trim()} className="flex-1 flex items-center justify-center gap-1.5 bg-accent-rose/10 text-accent-rose border border-accent-rose/20 text-xs font-bold py-2 rounded-lg transition-all disabled:opacity-50">
                        {processingId === item.id ? <div className="h-3 w-3 border-[1.5px] border-accent-rose/30 border-t-accent-rose rounded-full animate-spin" /> : <Send className="h-3 w-3" />}Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(item)} disabled={processingId === item.id} className="flex-1 flex items-center justify-center gap-1.5 gradient-primary text-white text-xs font-bold py-2.5 rounded-xl shadow-glow-sm hover:brightness-110 transition-all disabled:opacity-50">
                      {processingId === item.id ? <div className="h-3.5 w-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}Aprovar
                    </button>
                    <button onClick={() => setRejectingId(item.id)} disabled={processingId === item.id} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-800/50 text-surface-300 hover:text-accent-rose border border-surface-700 text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" />Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
