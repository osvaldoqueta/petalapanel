/**
 * MerchantHubPage — Área de gestão para parceiros lojistas.
 * Sellers veem apenas dados da sua própria loja.
 * Admins/Super Users veem dados consolidados de todas as lojas.
 */
import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CampaignTable } from '@/modules/merchant/components/CampaignTable'
import { ModerationPanel } from '@/modules/merchant/components/ModerationPanel'
import { MerchantKPIs } from '@/modules/merchant/components/MerchantKPIs'
import { InventoryHealth } from '@/modules/merchant/components/InventoryHealth'
import { useStoreContext } from '@/modules/merchant/hooks/useStoreContext'
import { MerchantInventory } from '@/modules/merchant/components/MerchantInventory'
import { AdsManager } from '@/modules/merchant/components/AdsManager'
import { MerchantSupport } from '@/modules/merchant/components/MerchantSupport'
import { merchantRepository } from '@/repositories/merchantRepository'
import { Store, LayoutDashboard, Package, Megaphone, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'dashboard' | 'inventory' | 'marketing' | 'support'

export default function MerchantHubPage() {
  const { storeId, storeName, isOwner } = useStoreContext()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [isPending, startTransition] = useTransition()

  // Live unanswered question count for badge
  const { data: unansweredCount = 0 } = useQuery({
    queryKey: ['merchant-unanswered-count', storeId],
    queryFn: () => merchantRepository.getUnansweredCount(storeId),
    enabled: !!storeId,
    refetchInterval: 60_000, // Poll every 60s as fallback to realtime
    staleTime: 30_000,
  })

  const handleTabChange = (tab: Tab) => {
    startTransition(() => {
      setActiveTab(tab)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/10 text-accent-cyan">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isOwner ? storeName || 'Minha Loja' : 'Merchant Hub'}
            </h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {isOwner
                ? 'Métricas, campanhas e moderação da sua loja'
                : 'Visão consolidada de todas as lojas parceiras'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-800/50 p-1 rounded-xl">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'dashboard' ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => handleTabChange('inventory')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'inventory' ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white'
            )}
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventário</span>
          </button>
          <button
            onClick={() => handleTabChange('marketing')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'marketing' ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white'
            )}
          >
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing</span>
          </button>
          <button
            onClick={() => handleTabChange('support')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative',
              activeTab === 'support' ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white'
            )}
          >
            <MessageCircleQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">Suporte</span>
            {unansweredCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-amber text-[10px] font-bold text-surface-950 shadow-lg animate-fade-in px-1">
                {unansweredCount > 99 ? '99+' : unansweredCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn('transition-opacity duration-200', isPending && 'opacity-50')}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPIs */}
            <MerchantKPIs storeId={storeId} />

            {/* Two-column layout for Campaigns + Inventory Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CampaignTable storeId={storeId} />
              <InventoryHealth storeId={storeId} />
            </div>

            {/* Moderation */}
            <ModerationPanel storeId={storeId} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-fade-in">
            <MerchantInventory />
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="animate-fade-in">
            <AdsManager />
          </div>
        )}

        {activeTab === 'support' && (
          <div className="animate-fade-in">
            <MerchantSupport />
          </div>
        )}
      </div>
    </div>
  )
}
