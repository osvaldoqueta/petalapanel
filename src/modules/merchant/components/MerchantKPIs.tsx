/**
 * MerchantKPIs — KPI cards privados filtrados pela loja do Seller.
 * Admins veem métricas globais de todas as lojas.
 */
import { useQuery } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { MetricCard } from '@/modules/bi/components/MetricCard'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { DollarSign, ShoppingCart, TrendingUp, Video } from 'lucide-react'

interface MerchantKPIsProps {
  storeId: string | null
}

export function MerchantKPIs({ storeId }: MerchantKPIsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['merchant-kpis', storeId],
    queryFn: () => merchantRepository.getKPIs(storeId),
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
