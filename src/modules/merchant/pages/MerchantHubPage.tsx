/**
 * MerchantHubPage — Área de gestão para parceiros lojistas.
 * Sellers veem apenas dados da sua própria loja.
 * Admins/Super Users veem dados consolidados de todas as lojas.
 */
import { CampaignTable } from '@/modules/merchant/components/CampaignTable'
import { ModerationPanel } from '@/modules/merchant/components/ModerationPanel'
import { MerchantKPIs } from '@/modules/merchant/components/MerchantKPIs'
import { InventoryHealth } from '@/modules/merchant/components/InventoryHealth'
import { useStoreContext } from '@/modules/merchant/hooks/useStoreContext'
import { Store } from 'lucide-react'

export default function MerchantHubPage() {
  const { storeId, storeName, isOwner } = useStoreContext()

  return (
    <div className="space-y-6">
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
  )
}
