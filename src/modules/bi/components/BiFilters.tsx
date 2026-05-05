/**
 * BiFilters — Barra horizontal de filtros dinâmicos para o Dashboard BI.
 */
import { cn } from '@/lib/utils'
import { Calendar, Download, MapPin, Tag } from 'lucide-react'
import type { BiFilterState, BiPeriod } from '@/shared/types'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface BiFiltersProps {
  filters: BiFilterState
  onChange: (filters: BiFilterState) => void
  onExport: () => void
}

export function BiFilters({ filters, onChange, onExport }: BiFiltersProps) {
  // Fetch distinct categories from store_inventory
  const { data: categories } = useQuery({
    queryKey: ['bi-categories-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('store_inventory')
        .select('category')
        .not('category', 'is', null)
      
      if (!data) return []
      const unique = Array.from(new Set(data.map(d => d.category)))
      return unique.sort()
    },
    staleTime: 60 * 60 * 1000,
  })

  const handlePeriodChange = (p: BiPeriod) => {
    onChange({ ...filters, period: p })
  }

  return (
    <div className="glass rounded-xl p-2 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period Selector */}
        <div className="flex items-center bg-surface-900/50 p-1 rounded-lg border border-surface-800/50">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id as BiPeriod)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                filters.period === p.id
                  ? 'bg-petala-500 text-white shadow-sm'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => handlePeriodChange('custom')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              filters.period === 'custom'
                ? 'bg-petala-500 text-white shadow-sm'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
            )}
          >
            <Calendar className="h-3 w-3" />
            Custom
          </button>
        </div>

        {/* Category Selector */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
          <select
            value={filters.category || ''}
            onChange={(e) => onChange({ ...filters, category: e.target.value || null })}
            className="appearance-none pl-9 pr-8 py-2 bg-surface-900/50 border border-surface-800/50 rounded-lg text-xs text-white outline-none focus:border-petala-500/50 transition-colors"
          >
            <option value="">Todas as Categorias</option>
            {categories?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Region Selector */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
          <select
            value={filters.region || ''}
            onChange={(e) => onChange({ ...filters, region: e.target.value || null })}
            className="appearance-none pl-9 pr-8 py-2 bg-surface-900/50 border border-surface-800/50 rounded-lg text-xs text-white outline-none focus:border-petala-500/50 transition-colors"
          >
            <option value="">Brasil (Todas)</option>
            <option value="Juiz de Fora">Juiz de Fora e arredores</option>
          </select>
        </div>
      </div>

      {/* Export Action */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-surface-800/50 hover:bg-surface-800 text-surface-300 hover:text-white rounded-lg text-xs font-medium transition-all"
      >
        <Download className="h-4 w-4" />
        Exportar CSV
      </button>
    </div>
  )
}
