/**
 * SalesChart — Gráfico de vendas agregadas (Power BI style).
 * Consome a tabela orders para exibir revenue, count e AOV por período.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ChartSkeleton } from '@/components/Skeleton'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface SalesDataPoint {
  date: string
  revenue: number
  orders: number
}

export function SalesChart() {
  const { data, isLoading } = useQuery<SalesDataPoint[]>({
    queryKey: ['bi-sales-chart'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Aggregate by day
      const byDay = new Map<string, { revenue: number; orders: number }>()
      for (const order of orders || []) {
        const day = new Date(order.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
        const existing = byDay.get(day) || { revenue: 0, orders: 0 }
        existing.revenue += Number(order.total_amount) || 0
        existing.orders += 1
        byDay.set(day, existing)
      }

      return Array.from(byDay.entries()).map(([date, vals]) => ({
        date,
        ...vals,
      }))
    },
    staleTime: 10 * 60 * 1000,   // 10min — BI data is not real-time
    gcTime: 30 * 60 * 1000,
  })

  if (isLoading) return <ChartSkeleton className="col-span-full" />

  return (
    <div className="glass rounded-2xl p-6 col-span-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Receita — Últimos 30 dias</h3>
          <p className="text-xs text-surface-500 mt-0.5">Agregação diária de pedidos finalizados</p>
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
              contentStyle={{
                backgroundColor: '#1a1d28',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
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
