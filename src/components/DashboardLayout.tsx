/**
 * DashboardLayout — Layout wrapper principal com Sidebar + content area.
 * Inclui Alertas de Elite (Real-time) para eventos vitais do SuperAdmin.
 */
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { supabaseAdmin } from '@/integrations/supabase/admin'
import { toast } from 'sonner'
import { DollarSign, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Som discreto para notificações (Base64 pequeno MP3/WAV)
const BEEP_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqPb3BxfoaPjI2PjY2PjYyNjY2PjYyNjY2NjYyNjYyNjY2MjYyNjYyNjYyNjYyNjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjYyMjY='

export function DashboardLayout() {
  useEffect(() => {
    // Listener Global para Vendas de Alto Valor
    const ordersChannel = supabaseAdmin.channel('elite-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new
          if (order.total_amount > 1000) {
            // Tocar som discreto
            const audio = new Audio(BEEP_SOUND)
            audio.volume = 0.5
            audio.play().catch(() => {})

            toast.success(
              <div className="flex flex-col gap-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Venda Alta Detectada!
                </span>
                <span className="text-sm text-surface-200">
                  Um novo pedido de {formatCurrency(order.total_amount)} foi realizado.
                </span>
              </div>,
              { duration: 10000, id: `order-${order.id}` }
            )
          }
        }
      )
      .subscribe()

    // Listener Global para Novas Denúncias de Vídeo
    const reportsChannel = supabaseAdmin.channel('elite-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'video_reports' },
        (payload) => {
          const report = payload.new
          // Tocar som discreto
          const audio = new Audio(BEEP_SOUND)
          audio.volume = 0.5
          audio.play().catch(() => {})

          toast.error(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-accent-rose flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Nova Denúncia
              </span>
              <span className="text-sm text-surface-200">
                Um vídeo foi denunciado por: {report.reason_category || 'Motivo não especificado'}.
              </span>
            </div>,
            { duration: 15000, id: `report-${report.id}` }
          )
        }
      )
      .subscribe()

    return () => {
      supabaseAdmin.removeChannel(ordersChannel)
      supabaseAdmin.removeChannel(reportsChannel)
    }
  }, [])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
