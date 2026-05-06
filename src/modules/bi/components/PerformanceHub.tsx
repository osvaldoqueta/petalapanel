/**
 * PerformanceHub — Dashboard de Observabilidade CWV (Core Web Vitals).
 * Exibe métricas LCP, INP e CLS coletadas do app nativo via app_logs.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminRepository } from '@/repositories/adminRepository'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { ChartSkeleton } from '@/components/Skeleton'
import { Activity, Gauge, Monitor, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

// CWV Thresholds (Google)
const CWV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
}

type MetricName = 'LCP' | 'INP' | 'CLS'
type ConnectionFilter = 'all' | '4g' | 'wifi' | 'slow'

const METRIC_TABS: { key: MetricName; label: string; unit: string; color: string }[] = [
  { key: 'LCP', label: 'Largest Contentful Paint', unit: 'ms', color: '#3b82f6' },
  { key: 'INP', label: 'Interaction to Next Paint', unit: 'ms', color: '#8b5cf6' },
  { key: 'CLS', label: 'Cumulative Layout Shift', unit: '', color: '#f59e0b' },
]

export function PerformanceHub() {
  const [activeMetric, setActiveMetric] = useState<MetricName>('LCP')
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all')
  const [days, setDays] = useState(7)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['performance-cwv', days],
    queryFn: () => adminRepository.getPerformanceLogs(days),
    staleTime: 5 * 60 * 1000,
  })

  // Parse and aggregate logs into chart data
  const chartData = useMemo(() => {
    if (!logs.length) return []

    // Filter by connection type if needed
    const filtered = logs.filter((log: any) => {
      if (connectionFilter === 'all') return true
      try {
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        if (connectionFilter === 'slow') return meta?.device_memory && meta.device_memory < 4
        return meta?.connection === connectionFilter
      } catch {
        return true
      }
    })

    // Group by date + metric
    const byDate = new Map<string, { lcp: number[]; inp: number[]; cls: number[] }>()

    filtered.forEach((log: any) => {
      try {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        if (!byDate.has(date)) byDate.set(date, { lcp: [], inp: [], cls: [] })
        const bucket = byDate.get(date)!

        if (meta?.metric_name === 'LCP' && meta.value != null) bucket.lcp.push(meta.value)
        if (meta?.metric_name === 'INP' && meta.value != null) bucket.inp.push(meta.value)
        if (meta?.metric_name === 'CLS' && meta.value != null) bucket.cls.push(meta.value)
      } catch { /* skip malformed */ }
    })

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: date.split('-').slice(1).join('/'),
        LCP: Math.round(avg(vals.lcp)),
        INP: Math.round(avg(vals.inp)),
        CLS: Number(avg(vals.cls).toFixed(3)),
        samples: vals.lcp.length + vals.inp.length + vals.cls.length,
      }))
  }, [logs, connectionFilter])

  // P75 calculation for scorecard
  const p75 = useMemo(() => {
    const values = chartData.map(d => d[activeMetric]).filter(v => v > 0).sort((a, b) => a - b)
    if (!values.length) return null
    const idx = Math.ceil(values.length * 0.75) - 1
    return values[idx]
  }, [chartData, activeMetric])

  const threshold = CWV_THRESHOLDS[activeMetric]
  const metricInfo = METRIC_TABS.find(m => m.key === activeMetric)!

  const getScoreColor = (val: number | null) => {
    if (val == null) return 'text-surface-400'
    if (val <= threshold.good) return 'text-emerald-400'
    if (val <= threshold.poor) return 'text-accent-amber'
    return 'text-accent-rose'
  }

  if (isLoading) {
    return <ChartSkeleton className="mt-6" />
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Observabilidade CWV</h3>
            <p className="text-xs text-surface-400">Core Web Vitals de dispositivos reais</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                days === d
                  ? 'bg-surface-800 text-white'
                  : 'text-surface-400 hover:text-white'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric tabs + Score */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-1 bg-surface-800/50 p-1 rounded-xl">
          {METRIC_TABS.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeMetric === m.key
                  ? 'bg-surface-800 text-white shadow-sm'
                  : 'text-surface-400 hover:text-white'
              )}
            >
              {m.key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {/* Connection filter */}
          <div className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-surface-500" />
            <select
              value={connectionFilter}
              onChange={e => setConnectionFilter(e.target.value as ConnectionFilter)}
              className="bg-surface-900 border border-surface-700 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-petala-500"
            >
              <option value="all">Todas conexões</option>
              <option value="4g">4G</option>
              <option value="wifi">Wi-Fi</option>
              <option value="slow">Dispositivos lentos (&lt;4GB)</option>
            </select>
          </div>

          {/* P75 Score */}
          <div className="text-right">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">P75</p>
            <p className={cn('text-xl font-bold', getScoreColor(p75 ?? null))}>
              {p75 != null ? `${p75}${metricInfo.unit}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1d28',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={threshold.good}
                stroke="#10b981"
                strokeDasharray="6 3"
                label={{ value: 'Good', fill: '#10b981', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={threshold.poor}
                stroke="#f43f5e"
                strokeDasharray="6 3"
                label={{ value: 'Poor', fill: '#f43f5e', fontSize: 10, position: 'right' }}
              />
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={metricInfo.color}
                strokeWidth={2}
                dot={{ r: 3, fill: metricInfo.color }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center text-surface-500">
          <Monitor className="h-12 w-12 mb-3 text-surface-700" />
          <p className="text-sm font-medium">Nenhum dado de performance encontrado</p>
          <p className="text-xs mt-1">Registros CWV aparecerão quando dispositivos reais reportarem métricas.</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] text-surface-500 pt-2 border-t border-surface-800/50">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" />
          <span>{metricInfo.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Good ≤ {threshold.good}{metricInfo.unit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent-rose" />
          <span>Poor &gt; {threshold.poor}{metricInfo.unit}</span>
        </div>
        {chartData.length > 0 && (
          <span className="ml-auto">{chartData.reduce((s, d) => s + d.samples, 0)} amostras</span>
        )}
      </div>
    </div>
  )
}
