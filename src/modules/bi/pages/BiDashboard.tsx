/**
 * BiDashboard — Dashboard principal de Business Intelligence (Power BI style).
 * Exibe KPIs de vendas, pedidos e engajamento de vídeo.
 * Agora com filtros Omni e exportação de relatórios.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { MetricCard } from '@/modules/bi/components/MetricCard'
import { SalesChart } from '@/modules/bi/components/SalesChart'
import { VideoEngagementChart } from '@/modules/bi/components/VideoEngagementChart'
import { PerformanceHub } from '@/modules/bi/components/PerformanceHub'
import { BiFilters } from '@/modules/bi/components/BiFilters'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { DollarSign, ShoppingCart, TrendingUp, Video } from 'lucide-react'
import { useExportData } from '@/hooks/useExportData'
import type { BiFilterState } from '@/shared/types'
import { toast } from 'sonner'

export default function BiDashboard() {
  const [filters, setFilters] = useState<BiFilterState>({
    period: '30d',
    startDate: null,
    endDate: null,
    category: null,
    region: null,
  })

  const { exportData } = useExportData()

  // Aggregate metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['bi-kpi-metrics', filters],
    queryFn: async () => {
      const now = new Date()
      let days = 30
      if (filters.period === 'today') days = 1
      else if (filters.period === '7d') days = 7
      
      const currentStart = new Date(now)
      currentStart.setDate(now.getDate() - days)
      
      const previousStart = new Date(currentStart)
      previousStart.setDate(currentStart.getDate() - days)

      // Fetch current period — only paid orders
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_amount, platform_fee')
        .eq('payment_status', 'paid')
        .gte('created_at', currentStart.toISOString())

      // Previous period for comparison
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount, platform_fee')
        .eq('payment_status', 'paid')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', currentStart.toISOString())

      const currentGTV = (currentOrders || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0), 0
      )
      const previousGTV = (previousOrders || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0), 0
      )

      const currentRevenue = (currentOrders || []).reduce(
        (sum, o) => sum + (Number(o.platform_fee) || 0), 0
      )
      const previousRevenue = (previousOrders || []).reduce(
        (sum, o) => sum + (Number(o.platform_fee) || 0), 0
      )

      const currentCount = currentOrders?.length || 0
      const previousCount = previousOrders?.length || 0

      const currentAOV = currentCount > 0 ? currentGTV / currentCount : 0
      const previousAOV = previousCount > 0 ? previousGTV / previousCount : 0

      const gtvChange = previousGTV > 0
        ? ((currentGTV - previousGTV) / previousGTV) * 100
        : 0

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
        gtv: currentGTV,
        gtvChange,
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
  })

  const handleExport = async () => {
    try {
      toast.loading('Gerando exportação de vendas...', { id: 'export' })
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, stores(name, location)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      
      const cleanData = data.map(d => ({
        Pedido_ID: d.id,
        Valor: Number(d.total_amount).toFixed(2),
        Status: d.status,
        Data: new Date(d.created_at).toLocaleDateString('pt-BR'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Loja: (d.stores as any)?.name || 'Desconhecida'
      }))

      exportData(cleanData, 'relatorio_vendas_petala', 'csv')
      toast.success('Exportação concluída!', { id: 'export' })
    } catch (e) {
      console.error(e)
      toast.error('Erro ao exportar dados.', { id: 'export' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard BI</h1>
        <p className="text-sm text-surface-400 mt-1">
          Visão consolidada de vendas, métricas e engajamento do marketplace
        </p>
      </div>

      {/* Filtros Omni */}
      <BiFilters 
        filters={filters} 
        onChange={setFilters} 
        onExport={handleExport}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title={`GTV (${filters.period})`}
          value={formatCurrency(metrics?.gtv ?? 0)}
          change={metrics?.gtvChange}
          icon={<DollarSign className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-emerald-400"
        />
        <MetricCard
          title={`Receita (${filters.period})`}
          value={formatCurrency(metrics?.revenue ?? 0)}
          change={metrics?.revenueChange}
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-purple"
        />
        <MetricCard
          title={`Pedidos (${filters.period})`}
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
          icon={<DollarSign className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-amber"
        />
        <MetricCard
          title="Video Views"
          value={formatCompact(metrics?.totalVideoViews ?? 0)}
          icon={<Video className="h-5 w-5" />}
          isLoading={isLoading}
          accentColor="text-accent-rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart filters={filters} />
        <VideoEngagementChart filters={filters} />
      </div>

      {/* Performance Hub (CWV) */}
      <PerformanceHub />
    </div>
  )
}
