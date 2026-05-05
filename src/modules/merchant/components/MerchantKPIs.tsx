/**
 * MerchantKPIs — KPI cards privados filtrados pela loja do Seller.
 * Admins veem métricas globais de todas as lojas.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { MetricCard } from '@/modules/bi/components/MetricCard'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { DollarSign, ShoppingCart, TrendingUp, Video } from 'lucide-react'

interface MerchantKPIsProps {
  storeId: string | null
}

export function MerchantKPIs({ storeId }: MerchantKPIsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['merchant-kpis', storeId],
    queryFn: async () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)

      // Orders
      let ordersQuery = supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (storeId) {
        ordersQuery = ordersQuery.eq('store_id', storeId)
      }

      const { data: orders } = await ordersQuery

      const revenue = (orders || []).reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
      const orderCount = orders?.length || 0
      const aov = orderCount > 0 ? revenue / orderCount : 0

      // Video views
      let videoQuery = supabase
        .from('store_inventory')
        .select('video_views')
        .not('video_url', 'is', null)

      if (storeId) {
        videoQuery = videoQuery.eq('store_id', storeId)
      }

      const { data: videos } = await videoQuery
      const totalViews = (videos || []).reduce((s, v) => s + (Number(v.video_views) || 0), 0)

      return { revenue, orderCount, aov, totalViews }
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Receita (30d)"
        value={formatCurrency(metrics?.revenue ?? 0)}
        icon={<DollarSign className="h-5 w-5" />}
        isLoading={isLoading}
        accentColor="text-emerald-400"
      />
      <MetricCard
        title="Pedidos (30d)"
        value={String(metrics?.orderCount ?? 0)}
        icon={<ShoppingCart className="h-5 w-5" />}
        isLoading={isLoading}
        accentColor="text-accent-blue"
      />
      <MetricCard
        title="Ticket Médio"
        value={formatCurrency(metrics?.aov ?? 0)}
        icon={<TrendingUp className="h-5 w-5" />}
        isLoading={isLoading}
        accentColor="text-accent-purple"
      />
      <MetricCard
        title="Video Views"
        value={formatCompact(metrics?.totalViews ?? 0)}
        icon={<Video className="h-5 w-5" />}
        isLoading={isLoading}
        accentColor="text-accent-amber"
      />
    </div>
  )
}
