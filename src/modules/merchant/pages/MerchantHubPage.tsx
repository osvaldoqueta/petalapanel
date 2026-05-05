/**
 * MerchantHubPage — Área de gestão para parceiros lojistas.
 */
import { CampaignTable } from '@/modules/merchant/components/CampaignTable'
import { ModerationPanel } from '@/modules/merchant/components/ModerationPanel'
import { Store } from 'lucide-react'

export default function MerchantHubPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/10 text-accent-cyan">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Merchant Hub</h1>
          <p className="text-sm text-surface-400 mt-0.5">Gestão de campanhas e moderação de conteúdo</p>
        </div>
      </div>
      <CampaignTable />
      <ModerationPanel />
    </div>
  )
}
