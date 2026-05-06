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
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return
          
          const order = payload.new
          // Apenas dispara alerta se for uma venda >= 1000 e estiver paga (ou recém criada com valor alto)
          if (order.total_amount >= 1000 && (payload.eventType === 'INSERT' || order.payment_status === 'paid')) {
            // Se for UPDATE, só alerta se o status mudou para 'paid'
            if (payload.eventType === 'UPDATE' && payload.old.payment_status === 'paid') return

            // Tocar som discreto
            const audio = new Audio(BEEP_SOUND)
            audio.volume = 0.5
            audio.play().catch(() => {})

            toast.custom(
              (t) => (
                <div 
                  onClick={() => toast.dismiss(t)}
                  className="bg-surface-900 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] p-4 rounded-xl flex items-start gap-3 cursor-pointer w-full max-w-sm"
                >
                  <div className="bg-amber-500/10 p-2 rounded-lg mt-0.5">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-amber-500 font-bold text-sm tracking-tight flex items-center gap-2">
                      Venda Alta Aprovada!
                    </h4>
                    <p className="text-surface-300 text-xs mt-1">
                      Pedido <span className="font-mono text-white/80">#{order.id.split('-')[0]}</span> no valor de <strong className="text-white">{formatCurrency(order.total_amount)}</strong>.
                    </p>
                  </div>
                </div>
              ),
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
