/**
 * OrderDisputeLogs — Central de Disputas e Chat por pedido.
 * SuperAdmin/Suporte visualiza histórico de mensagens de um pedido.
 * Carrega order_messages filtradas pelo order_id em ScrollArea modal.
 */
import { useQuery } from '@tanstack/react-query'
import { orderRepository } from '@/repositories/orderRepository'
import { formatRelativeDate } from '@/lib/utils'
import { Skeleton } from '@/components/Skeleton'
import { MessageSquare, X, User, ShieldCheck, Store, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderDisputeLogsProps {
  orderId: string
  onClose: () => void
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  buyer: { label: 'Comprador', color: 'bg-blue-500/10 text-blue-400', icon: <User className="h-3 w-3" /> },
  seller: { label: 'Vendedor', color: 'bg-petala-500/10 text-petala-400', icon: <Store className="h-3 w-3" /> },
  support: { label: 'Suporte', color: 'bg-purple-500/10 text-purple-400', icon: <ShieldCheck className="h-3 w-3" /> },
  system: { label: 'Sistema', color: 'bg-surface-700/50 text-surface-400', icon: <Bot className="h-3 w-3" /> },
}

export function OrderDisputeLogs({ orderId, onClose }: OrderDisputeLogsProps) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['order-messages', orderId],
    queryFn: () => orderRepository.getOrderMessages(orderId),
    enabled: !!orderId,
    staleTime: 30_000,
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-[100]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[110] p-4 max-h-[85vh]">
        <div className="glass rounded-3xl shadow-2xl bg-surface-900 border border-surface-700/50 flex flex-col animate-slide-up max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-surface-800/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Chat do Pedido</h3>
                <p className="text-[11px] text-surface-500">#{orderId.split('-')[0].toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages ScrollArea */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[200px] max-h-[55vh]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-400">Nenhuma mensagem encontrada</p>
                <p className="text-[11px] text-surface-600 mt-1">O chat deste pedido está vazio</p>
              </div>
            ) : (
              messages.map(msg => {
                const role = ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.system
                const isSupport = msg.sender_role === 'support' || msg.sender_role === 'system'

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      isSupport && 'flex-row-reverse'
                    )}
                  >
                    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', role.color)}>
                      {role.icon}
                    </div>
                    <div className={cn('max-w-[75%]', isSupport && 'text-right')}>
                      <div className={cn('flex items-center gap-2 mb-1', isSupport && 'justify-end')}>
                        <span className="text-[10px] font-semibold text-surface-400">
                          {msg.sender_name || role.label}
                        </span>
                        <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', role.color)}>
                          {role.label}
                        </span>
                      </div>
                      <div className={cn(
                        'px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed',
                        isSupport
                          ? 'bg-purple-500/10 text-purple-100 rounded-tr-md'
                          : 'bg-surface-800 text-surface-200 rounded-tl-md'
                      )}>
                        {msg.message}
                      </div>
                      <p className={cn('text-[9px] text-surface-600 mt-1', isSupport && 'text-right')}>
                        {formatRelativeDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-surface-800/30 shrink-0">
            <p className="text-[10px] text-surface-600 text-center">
              {messages.length} mensagens • Somente visualização
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
