/**
 * FinancialAudit — Hub de Auditoria Financeira para SuperAdmin.
 * Monitora integridade de repasses via Stripe Connect.
 * Botão "Forçar Repasse" com ConfirmDialog de segurança.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderRepository } from '@/repositories/orderRepository'
import { useAuditLog } from '@/hooks/useAuditLog'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import { OrderTableSkeleton } from '@/components/Skeleton'
import { toast } from 'sonner'
import type { Order } from '@/shared/types'
import {
  Wallet, CheckCircle, AlertTriangle, Send,
  ShieldCheck, DollarSign, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Inline OrderDisputeLogs for chat viewing
import { OrderDisputeLogs } from './OrderDisputeLogs'

export function FinancialAudit() {
  const { log } = useAuditLog()
  const queryClient = useQueryClient()
  const [confirmPayoutId, setConfirmPayoutId] = useState<string | null>(null)
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['audit-orders'],
    queryFn: () => orderRepository.getAuditOrders(),
    staleTime: 3 * 60 * 1000,
  })

  const payoutMutation = useMutation({
    mutationFn: (orderId: string) => orderRepository.forceReleasePayout(orderId),
    onSuccess: async (_, orderId) => {
      toast.success('Repasse forçado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['audit-orders'] })
      setConfirmPayoutId(null)
      await log({
        action: 'force_release_payout',
        table_name: 'orders',
        record_key: orderId,
        old_value: 'payout_released: false',
        new_value: 'payout_released: true',
        entity: 'payout',
      })
    },
    onError: (err: any) => {
      toast.error('Falha no repasse: ' + err.message)
      setConfirmPayoutId(null)
    },
  })

  const releasedCount = orders.filter(o => o.payout_released).length
  const pendingCount = orders.filter(o => !o.payout_released).length
  const totalGtv = orders.reduce((s, o) => s + o.total_amount, 0)

  if (isLoading) return <OrderTableSkeleton />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-petala-400" />
          </div>
          <div>
            <p className="text-[11px] text-surface-400 font-medium uppercase tracking-wider">GTV Pago</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totalGtv)}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-petala-400" />
          </div>
          <div>
            <p className="text-[11px] text-surface-400 font-medium uppercase tracking-wider">Repassados</p>
            <p className="text-xl font-bold text-white">{releasedCount}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] text-surface-400 font-medium uppercase tracking-wider">Pendentes</p>
            <p className="text-xl font-bold text-white">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-800/50 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-petala-400" />
          <h3 className="text-sm font-bold text-white">Auditoria de Repasses</h3>
          <span className="text-[10px] text-surface-500 ml-auto">{orders.length} pedidos pagos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800/50">
                {['Pedido', 'Loja', 'Valor', 'Taxa', 'Repasse', 'Data', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-bold text-white">#{order.id.split('-')[0].toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-300">{order.store_name || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-white">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-surface-400">{formatCurrency(order.platform_fee || 0)}</td>
                  <td className="px-4 py-3">
                    {order.payout_released ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-petala-400 bg-petala-500/10 px-2 py-0.5 rounded-full w-fit">
                        <ShieldCheck className="h-3 w-3" /> Repassado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full w-fit">
                        <AlertTriangle className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-surface-500">{formatRelativeDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {!order.payout_released && (
                        <button
                          onClick={() => setConfirmPayoutId(order.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-petala-500/10 text-petala-400 border border-petala-500/20 hover:bg-petala-500/20 transition-all"
                        >
                          <Send className="h-3 w-3" /> Forçar Repasse
                        </button>
                      )}
                      <button
                        onClick={() => setChatOrderId(order.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-all"
                      >
                        <MessageSquare className="h-3 w-3" /> Ver Chat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Payout Dialog */}
      {confirmPayoutId && (
        <>
          <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-[100]" onClick={() => setConfirmPayoutId(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[110] p-4">
            <div className="glass rounded-3xl p-6 shadow-2xl bg-surface-900 border border-surface-700/50 flex flex-col items-center text-center animate-slide-up">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Forçar Repasse</h3>
              <p className="text-sm text-surface-400 mb-2">
                Esta ação irá liberar o pagamento ao lojista via Stripe Connect.
              </p>
              <p className="text-xs text-amber-400/80 mb-6">
                Pedido: #{confirmPayoutId.split('-')[0].toUpperCase()}
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setConfirmPayoutId(null)}
                  disabled={payoutMutation.isPending}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-surface-800 hover:bg-surface-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => payoutMutation.mutate(confirmPayoutId)}
                  disabled={payoutMutation.isPending}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white gradient-primary hover:brightness-110 shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {payoutMutation.isPending ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderDisputeLogs orderId={chatOrderId} onClose={() => setChatOrderId(null)} />
      )}
    </div>
  )
}
