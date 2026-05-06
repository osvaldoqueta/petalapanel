import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { useStoreContext } from '@/modules/merchant/context/StoreContext'
import { CampaignTable } from '@/modules/merchant/components/CampaignTable'
import { CampaignFormModal } from '@/modules/merchant/components/CampaignFormModal'
import { Plus, Megaphone, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { AdCampaign } from '@/shared/types'

export function AdsManager() {
  const { storeId } = useStoreContext()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Re-fetch campaigns to build the private BI
  const { data: campaigns, refetch } = useQuery<AdCampaign[]>({
    queryKey: ['admin-campaigns', storeId],
    queryFn: () => merchantRepository.getCampaigns(storeId),
    enabled: !!storeId,
  })

  // BI Privado: Mapear campanhas para o gráfico (Top 5 por gasto ou impressões)
  const chartData = (campaigns || [])
    .filter(c => c.budget_spent !== undefined && c.clicks !== undefined)
    .sort((a, b) => (b.budget_spent || 0) - (a.budget_spent || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.name || c.title || 'Campanha',
      gasto: Number(c.budget_spent) || 0,
      cliques: Number(c.clicks) || 0,
    }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-petala-500/10 text-petala-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Gerenciador de Ads</h3>
            <p className="text-xs text-surface-400 mt-0.5">Crie campanhas e impulsione vendas</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto gradient-primary px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Performance (Private BI) */}
        <div className="lg:col-span-1 glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-accent-blue" />
            <h3 className="text-sm font-semibold text-white">Top 5 Campanhas (Gasto)</h3>
          </div>
          
          <div className="flex-1 min-h-[250px]">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-surface-500 text-sm">
                Nenhum dado de campanha disponível.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#667291', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '...' : v}
                  />
                  <YAxis 
                    tick={{ fill: '#667291', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ backgroundColor: '#1a1d28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="gasto" name="Gasto (R$)" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabela de Campanhas */}
        <div className="lg:col-span-2">
          <CampaignTable storeId={storeId} />
        </div>
      </div>

      {isModalOpen && storeId && (
        <CampaignFormModal
          storeId={storeId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}
