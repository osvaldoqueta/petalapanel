/**
 * MerchantOrders — Central de Pedidos do Lojista.
 * Status handlers com loader, toast e invalidação TanStack.
 * Geração de DC-e (Declaração de Conteúdo) em PDF via jsPDF.
 */
import { useState, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { orderRepository } from '@/repositories/orderRepository'
import { useStoreContext } from '@/modules/merchant/context/StoreContext'
import { useAuditLog } from '@/hooks/useAuditLog'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import { OrderCardSkeleton } from '@/components/Skeleton'
import { toast } from 'sonner'
import type { Order } from '@/shared/types'
import {
  ShoppingBag, Package, Truck, CheckCircle, XCircle,
  Clock, ChefHat, FileText, User, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'pending' | 'preparing' | 'searching_courier' | 'shipped' | 'delivered' | 'cancelled'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: <Clock className="h-3.5 w-3.5" /> },
  preparing: { label: 'Preparando', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: <ChefHat className="h-3.5 w-3.5" /> },
  searching_courier: { label: 'Aguard. Coleta', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: <Search className="h-3.5 w-3.5" /> },
  shipped: { label: 'Enviado', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: <Truck className="h-3.5 w-3.5" /> },
  delivered: { label: 'Entregue', color: 'bg-petala-500/10 text-petala-400 border-petala-500/30', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: <XCircle className="h-3.5 w-3.5" /> },
}

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'searching_courier', label: 'Coleta' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregues' },
]

export function MerchantOrders() {
  const { storeId, storeName } = useStoreContext()
  const { log } = useAuditLog()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [, startTransition] = useTransition()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['merchant-orders', storeId],
    queryFn: () => orderRepository.getOrders(storeId),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
  })

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  // ─── Status mutation ──────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      await orderRepository.updateOrderStatus(storeId!, orderId, status)
      return { orderId, status }
    },
    onSuccess: async ({ orderId, status }) => {
      toast.success(`Pedido atualizado para "${STATUS_CONFIG[status]?.label || status}"`)
      queryClient.invalidateQueries({ queryKey: ['merchant-orders', storeId] })
      await log({
        action: 'update_order_status',
        table_name: 'orders',
        record_key: orderId,
        old_value: null,
        new_value: status,
        entity: 'order',
        store_id: storeId || undefined,
      })
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  })

  // ─── DC-e PDF Generator ───────────────────────────────────────────────────
  const generateDCe = async (order: Order) => {
    startTransition(() => {
      const doc = new jsPDF()
      const now = new Date()

      // Header
      doc.setFontSize(18)
      doc.setTextColor(16, 185, 129)
      doc.text('DECLARAÇÃO DE CONTEÚDO', 105, 20, { align: 'center' })
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text('(Conforme Convênio S/Nº de 1970 — Art. 4º da Lei 12.228/2010)', 105, 27, { align: 'center' })

      // Remetente
      doc.setFontSize(11)
      doc.setTextColor(40)
      doc.text('REMETENTE', 14, 40)
      doc.setFontSize(9)
      doc.setTextColor(80)
      doc.text(`Nome/Razão Social: ${storeName || 'Loja Pétala'}`, 14, 47)
      doc.text(`Pedido: #${order.id.split('-')[0].toUpperCase()}`, 14, 53)
      doc.text(`Data de Emissão: ${now.toLocaleDateString('pt-BR')}`, 14, 59)

      // Destinatário
      doc.setFontSize(11)
      doc.setTextColor(40)
      doc.text('DESTINATÁRIO', 14, 72)
      doc.setFontSize(9)
      doc.setTextColor(80)
      doc.text(`Nome: ${order.buyer_name || 'N/A'}`, 14, 79)
      doc.text(`E-mail: ${order.buyer_email || 'N/A'}`, 14, 85)

      // Tabela de Itens
      const items = order.items || []
      const tableColumn = ['#', 'Produto', 'Qtd', 'Valor Unit. (R$)', 'Subtotal (R$)']
      const tableRows = items.map((item, idx) => [
        String(idx + 1),
        item.product_name,
        String(item.quantity),
        Number(item.unit_price).toFixed(2),
        (Number(item.quantity) * Number(item.unit_price)).toFixed(2),
      ])

      // @ts-ignore - jspdf-autotable plugin
      doc.autoTable({
        startY: 95,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 70 } },
      })

      // @ts-ignore
      const finalY = doc.lastAutoTable?.finalY || 130

      // Totais
      doc.setFontSize(10)
      doc.setTextColor(40)
      doc.text(`Subtotal Produtos: ${formatCurrency(order.total_amount - order.delivery_fee)}`, 14, finalY + 10)
      doc.text(`Taxa de Entrega: ${formatCurrency(order.delivery_fee)}`, 14, finalY + 17)
      doc.setFontSize(12)
      doc.setTextColor(16, 185, 129)
      doc.text(`TOTAL: ${formatCurrency(order.total_amount)}`, 14, finalY + 27)

      // Rodapé
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text('Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da LC 87/96.', 14, finalY + 40)
      doc.text('Gerado automaticamente por Pétala Marketplace — petalapanel.foxstorebr.com', 14, finalY + 45)

      doc.save(`DCe_Pedido_${order.id.split('-')[0].toUpperCase()}.pdf`)
      toast.success('DC-e gerado com sucesso!')

      log({
        action: 'generate_dce_pdf',
        table_name: 'orders',
        record_key: order.id,
        old_value: null,
        new_value: `DC-e gerada para ${items.length} itens, total: ${order.total_amount}`,
        entity: 'dce_pdf',
        store_id: storeId || undefined,
      })
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === f.key
                ? 'bg-petala-500/20 border-petala-500/50 text-petala-400'
                : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-surface-500">{filtered.length} pedidos</span>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={(status) => statusMutation.mutate({ orderId: order.id, status })}
              onGenerateDCe={() => generateDCe(order)}
              isUpdating={statusMutation.isPending && statusMutation.variables?.orderId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Order Card Component ─────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, onGenerateDCe, isUpdating }: {
  order: Order
  onStatusChange: (status: Order['status']) => void
  onGenerateDCe: () => void
  isUpdating: boolean
}) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const items = order.items || []
  const isPaid = order.payment_status === 'paid'

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-800">
            <Package className="h-4 w-4 text-surface-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">#{order.id.split('-')[0].toUpperCase()}</p>
            <p className="text-[11px] text-surface-500">{formatRelativeDate(order.created_at)}</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold', config.color)}>
          {config.icon}
          {config.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Buyer Info */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-surface-800 flex items-center justify-center">
            {order.buyer_avatar ? (
              <img src={order.buyer_avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5 text-surface-500" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-white">{order.buyer_name}</p>
            <p className="text-[10px] text-surface-500">{order.buyer_email}</p>
          </div>
          {isPaid && (
            <span className="ml-auto text-[10px] font-bold text-petala-400 bg-petala-500/10 px-2 py-0.5 rounded-full">
              PAGO
            </span>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-surface-900/50 rounded-xl p-3 space-y-1.5">
            {items.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-surface-300 truncate max-w-[200px]">
                  {item.quantity}x {item.product_name}
                </span>
                <span className="text-surface-400 font-mono">
                  {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                </span>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-[10px] text-surface-500">+{items.length - 3} itens</p>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-800/30">
          <span className="text-xs text-surface-400">Total</span>
          <span className="text-base font-bold text-white">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-0">
        {order.status === 'pending' && (
          <button
            onClick={() => onStatusChange('preparing')}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="h-4 w-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            ) : (
              <ChefHat className="h-3.5 w-3.5" />
            )}
            Preparar
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => onStatusChange('searching_courier')}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="h-4 w-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Pronto p/ Coleta
          </button>
        )}

        {isPaid && (
          <button
            onClick={onGenerateDCe}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-surface-800 text-white hover:bg-surface-700 transition-all"
          >
            <FileText className="h-3.5 w-3.5 text-petala-400" />
            Gerar DC-e
          </button>
        )}
      </div>
    </div>
  )
}
