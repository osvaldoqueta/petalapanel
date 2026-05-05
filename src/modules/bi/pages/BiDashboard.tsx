/**
 * BiDashboard — Dashboard principal de Business Intelligence (Power BI style).
 * Exibe KPIs de vendas, pedidos e engajamento de vídeo.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { MetricCard } from '@/modules/bi/components/MetricCard'
import { SalesChart } from '@/modules/bi/components/SalesChart'
import { VideoEngagementChart } from '@/modules/bi/components/VideoEngagementChart'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { DollarSign, ShoppingCart, TrendingUp, Video } from 'lucide-react'

export default function BiDashboard() {
  // Aggregate metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['bi-kpi-metrics'],
    queryFn: async () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      const sixtyDaysAgo = new Date(now)
      sixtyDaysAgo.setDate(now.getDate() - 60)

      // Current period
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Previous period for comparison
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())

      const currentRevenue = (currentOrders || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0), 0
      )
      const previousRevenue = (previousOrders || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0), 0
      )

      const currentCount = currentOrders?.length || 0
      const previousCount = previousOrders?.length || 0

      const currentAOV = currentCount > 0 ? currentRevenue / currentCount : 0
      const previousAOV = previousCount > 0 ? previousRevenue / previousCount : 0

      const revenueChange = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0

      const countChange = previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : 0

      const aovChange = previousAOV > 0
        ? ((currentAOV - previousAOV) / previousAOV) * 100
        : 0

      // Video engagement total
      const { data: videoStats } = await supabase
        .from('store_inventory')
        .select('video_views, video_likes')
        .not('video_url', 'is', null)

      const totalViews = (videoStats || []).reduce(
        (sum, v) => sum + (Number(v.video_views) || 0), 0
      )

      return {
        revenue: currentRevenue,
        revenueChange,
        orderCount: currentCount,
        countChange,
        aov: currentAOV,
        aovChange,
        totalVideoViews: totalViews,
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard BI</h1>
        <p className="text-sm text-surface-400 mt-1">
          Visão consolidada de vendas, métricas e engajamento do marketplace
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita (30d)"
          value={formatCurrency(metrics?.revenue ?? 0)}
          change={metrics?.revenueChange}
          icon={<DollarSign className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-emerald-400"
        />
        <MetricCard
          title="Pedidos (30d)"
          value={String(metrics?.orderCount ?? 0)}
          change={metrics?.countChange}
          icon={<ShoppingCart className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-blue"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(metrics?.aov ?? 0)}
          change={metrics?.aovChange}
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-purple"
        />
        <MetricCard
          title="Video Views"
          value={formatCompact(metrics?.totalVideoViews ?? 0)}
          icon={<Video className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <VideoEngagementChart />
      </div>
    </div>
  )
}
