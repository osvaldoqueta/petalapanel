/**
 * SalesChart — Gráfico de vendas agregadas (Power BI style).
 * Exibe série atual e série comparativa (período anterior).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ChartSkeleton } from '@/components/Skeleton'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { BiFilterState } from '@/shared/types'

interface SalesChartProps {
  filters: BiFilterState
}

export function SalesChart({ filters }: SalesChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['bi-sales-chart', filters],
    queryFn: async () => {
      const now = new Date()
      let days = 30
      if (filters.period === 'today') days = 1
      else if (filters.period === '7d') days = 7
      
      const currentStart = new Date(now)
      currentStart.setDate(now.getDate() - days)
      
      const previousStart = new Date(currentStart)
      previousStart.setDate(currentStart.getDate() - days)

      // Fetch current period
      let query = supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', currentStart.toISOString())

      // Note: Full region/category filtering requires complex joins.
      // For this Np1 iteration, we apply basic time series fetching and O(n) local aggregation.

      const { data: currentOrders, error } = await query
      if (error) throw error

      // Fetch previous period
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', currentStart.toISOString())

      // O(n) Local Aggregation
      const chartData = []
      
      for (let i = 0; i < days; i++) {
        const d = new Date(currentStart)
        d.setDate(d.getDate() + i)
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        
        const prevD = new Date(previousStart)
        prevD.setDate(prevD.getDate() + i)
        
        // Sum current orders for this day
        const currentSum = (currentOrders || []).filter(o => {
          const od = new Date(o.created_at)
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth()
        }).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

        // Sum previous orders for this day
        const prevSum = (previousOrders || []).filter(o => {
          const od = new Date(o.created_at)
          return od.getDate() === prevD.getDate() && od.getMonth() === prevD.getMonth()
        }).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

        chartData.push({
          date: dateStr,
          revenue: currentSum,
          prev_revenue: prevSum,
        })
      }

      return chartData
    },
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) return <ChartSkeleton className="col-span-full" />

  return (
    <div className="glass rounded-2xl p-6 col-span-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Receita — Análise Comparativa</h3>
          <p className="text-xs text-surface-500 mt-0.5">Mês Atual (Verde) vs. Mês Anterior (Tracejado)</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1eb740" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1eb740" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#667291', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#667291', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1d28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toFixed(2)}`, 
                name === 'revenue' ? 'Período Atual' : 'Período Anterior'
              ]}
            />
            <Area
              type="monotone"
              dataKey="prev_revenue"
              stroke="#667291"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1eb740"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
