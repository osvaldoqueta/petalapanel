/**
 * Skeleton — Componente de placeholder de carregamento (Zero CLS — Np1.md).
 * Usado em gráficos, tabelas e cards de métricas durante o loading.
 */
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-skeleton rounded-xl bg-surface-800/50',
        className
      )}
    />
  )
}

/** Skeleton para cards de métrica */
export function MetricCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

/** Skeleton para gráficos — mantém aspect ratio fixo */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('glass rounded-2xl p-6', className)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  )
}

/** Skeleton para linhas de tabela */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-800/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/** Skeleton para tabela completa */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-surface-800/50">
        <Skeleton className="h-5 w-48" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-800/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
