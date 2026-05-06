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

/** Skeleton para barra de filtros do BI */
export function BiFiltersSkeleton() {
  return (
    <div className="glass rounded-xl p-2 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
  )
}

/** Skeleton para ThemeCard */
export function ThemeCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-16 w-full bg-surface-800/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex justify-end pt-2 border-t border-surface-800/30">
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton para cards de Q&A — Zero CLS para MerchantSupport */
export function QACardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4" style={{ minHeight: '140px' }}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton para tabela de usuários — Zero CLS para UserManagement */
export function UserTableSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800/50">
              {['Usuário', 'Email', 'Role', 'Cadastro', 'Ações'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left"><Skeleton className="h-3 w-16" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-800/30">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-28" /></div></td>
                <td className="px-5 py-3.5"><Skeleton className="h-4 w-40" /></td>
                <td className="px-5 py-3.5"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-5 py-3.5"><Skeleton className="h-3 w-16" /></td>
                <td className="px-5 py-3.5 text-right"><Skeleton className="h-7 w-24 rounded-lg ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Skeleton para card de moderação — Zero CLS para GlobalModeration */
export function ModerationCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-9 flex-1 rounded-xl" /><Skeleton className="h-9 flex-1 rounded-xl" /></div>
      </div>
    </div>
  )
}
