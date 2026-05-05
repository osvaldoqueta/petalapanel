/**
 * MetricCard — Card de métrica com ícone, valor, variação e skeleton loader.
 * Np1.md: Skeleton para Zero CLS.
 */
import { cn } from '@/lib/utils'
import { MetricCardSkeleton } from '@/components/Skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  change?: number       // percentual: +12.5 = crescimento, -3.2 = queda
  icon: React.ReactNode
  isLoading?: boolean
  accentColor?: string  // tailwind color class (text-accent-blue, etc.)
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  isLoading,
  accentColor = 'text-petala-400',
}: MetricCardProps) {
  if (isLoading) return <MetricCardSkeleton />

  const trendIcon = change === undefined || change === 0
    ? <Minus className="h-3.5 w-3.5" />
    : change > 0
      ? <TrendingUp className="h-3.5 w-3.5" />
      : <TrendingDown className="h-3.5 w-3.5" />

  const trendColor = change === undefined || change === 0
    ? 'text-surface-500'
    : change > 0
      ? 'text-emerald-400'
      : 'text-red-400'

  return (
    <div className="glass rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300 group animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-surface-400">
          {title}
        </span>
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          'bg-surface-800/50 group-hover:bg-surface-800',
          accentColor
        )}>
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-white tracking-tight mb-1">
        {value}
      </p>

      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          {trendIcon}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          <span className="text-surface-500 ml-1">vs. mês anterior</span>
        </div>
      )}
    </div>
  )
}
