/**
 * CampaignTable — Tabela de ad_campaigns com status, métricas e ações.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { TableSkeleton } from '@/components/Skeleton'
import { cn, formatCompact } from '@/lib/utils'
import { ExternalLink, Eye, MousePointer } from 'lucide-react'
import type { AdCampaign } from '@/shared/types'

function getStatusBadge(campaign: AdCampaign) {
  const now = new Date()
  const start = new Date(campaign.start_date)
  const end = new Date(campaign.end_date)

  if (!campaign.is_active) return { label: 'Pausada', color: 'bg-surface-700 text-surface-400' }
  if (now < start) return { label: 'Agendada', color: 'bg-accent-blue/10 text-accent-blue' }
  if (now > end) return { label: 'Encerrada', color: 'bg-surface-800 text-surface-500' }
  return { label: 'Ativa', color: 'bg-petala-500/10 text-petala-400' }
}

export function CampaignTable() {
  const { data: campaigns, isLoading } = useQuery<AdCampaign[]>({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as AdCampaign[]
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <TableSkeleton rows={6} cols={6} />

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-surface-800/30">
        <h3 className="text-sm font-semibold text-white">Campanhas Publicitárias</h3>
        <p className="text-xs text-surface-500 mt-0.5">
          {campaigns?.length ?? 0} campanhas registradas
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-surface-800/50">
              {['Campanha', 'Status', 'Período', 'Impressões', 'Cliques', 'CTR'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!campaigns || campaigns.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-surface-500">Nenhuma campanha encontrada</p>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const status = getStatusBadge(campaign)
                const ctr = campaign.impressions > 0
                  ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                  : '0.00'

                return (
                  <tr key={campaign.id} className="border-b border-surface-800/20 hover:bg-surface-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {campaign.image_url ? (
                          <img src={campaign.image_url} alt="" className="h-9 w-9 rounded-lg object-cover border border-surface-800" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-surface-800/50 flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-surface-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">
                            {campaign.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        status.color
                      )}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-surface-400 font-mono">
                        {new Date(campaign.start_date).toLocaleDateString('pt-BR')}
                        {' → '}
                        {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-surface-300">
                        <Eye className="h-3.5 w-3.5 text-surface-500" />
                        {formatCompact(campaign.impressions)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-surface-300">
                        <MousePointer className="h-3.5 w-3.5 text-surface-500" />
                        {formatCompact(campaign.clicks)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-sm font-semibold',
                        Number(ctr) >= 2 ? 'text-petala-400' : 'text-surface-400'
                      )}>
                        {ctr}%
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
