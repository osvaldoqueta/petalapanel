/**
 * AdminPage — Hub de administração SuperAdmin com tabs.
 */
import { useState, useTransition } from 'react'
import { UserManagement } from '@/modules/admin/components/UserManagement'
import { GlobalModeration } from '@/modules/admin/components/GlobalModeration'
import { MarketplaceSettings } from '@/modules/admin/components/MarketplaceSettings'
import { AdminBroadcast } from '@/modules/admin/components/AdminBroadcast'
import { FinancialAudit } from '@/modules/admin/components/FinancialAudit'
import { PlantsManagement } from '@/modules/admin/components/PlantsManagement'
import { AdminAffiliateProducts } from '@/modules/admin/components/AdminAffiliateProducts'
import { InstallsManagement } from '@/modules/admin/components/InstallsManagement'
import { AdminStaffPanel } from '@/modules/admin/components/AdminStaffPanel'
import { AdminAdvertisingPanel } from '@/modules/admin/components/AdminAdvertisingPanel'
import { AdminSales } from '@/modules/admin/components/AdminSales'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Users, Shield, Settings, Radio, Wallet, Leaf, ShoppingBag, HeartPulse, ShieldCheck, Megaphone, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminTab = 'users' | 'moderation' | 'settings' | 'broadcast' | 'payments' | 'plants' | 'affiliates' | 'installs' | 'staff' | 'advertising' | 'sales'

export default function AdminPage() {
  const { hasRole } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [isPending, startTransition] = useTransition()

  const handleTab = (tab: AdminTab) => startTransition(() => setActiveTab(tab))

  const tabs = [
    { key: 'users' as const, label: 'Usuários', icon: Users, minRole: 'Super User' as const },
    { key: 'moderation' as const, label: 'Moderação', icon: Shield, minRole: 'Support' as const },
    { key: 'settings' as const, label: 'Configurações', icon: Settings, minRole: 'Super User' as const },
    { key: 'broadcast' as const, label: 'Comunicação', icon: Radio, minRole: 'Super User' as const },
    { key: 'payments' as const, label: 'Pagamentos', icon: Wallet, minRole: 'Super User' as const },
    { key: 'plants' as const, label: 'Plantas', icon: Leaf, minRole: 'Super User' as const },
    { key: 'affiliates' as const, label: 'Afiliados', icon: ShoppingBag, minRole: 'Super User' as const },
    { key: 'installs' as const, label: 'Instalações', icon: HeartPulse, minRole: 'Super User' as const },
    { key: 'staff' as const, label: 'Equipe', icon: ShieldCheck, minRole: 'Super User' as const },
    { key: 'advertising' as const, label: 'Publicidade', icon: Megaphone, minRole: 'Super User' as const },
    { key: 'sales' as const, label: 'Vendas', icon: ShoppingCart, minRole: 'Super User' as const },
  ].filter(t => hasRole(t.minRole))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administração</h1>
          <p className="text-sm text-surface-400 mt-0.5">Gestão de usuários, moderação e configurações</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 bg-surface-800/50 p-2 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => handleTab(t.key)} className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            activeTab === t.key ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
          )}>
            <t.icon className="h-4 w-4 shrink-0" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className={cn('transition-opacity duration-200', isPending && 'opacity-50')}>
        {activeTab === 'users' && <div className="animate-fade-in"><UserManagement /></div>}
        {activeTab === 'moderation' && <div className="animate-fade-in"><GlobalModeration /></div>}
        {activeTab === 'settings' && <div className="animate-fade-in"><MarketplaceSettings /></div>}
        {activeTab === 'broadcast' && <div className="animate-fade-in"><AdminBroadcast /></div>}
        {activeTab === 'payments' && <div className="animate-fade-in"><FinancialAudit /></div>}
        {activeTab === 'plants' && <div className="animate-fade-in"><PlantsManagement /></div>}
        {activeTab === 'affiliates' && <div className="animate-fade-in"><AdminAffiliateProducts /></div>}
        {activeTab === 'installs' && <div className="animate-fade-in"><InstallsManagement /></div>}
        {activeTab === 'staff' && <div className="animate-fade-in"><AdminStaffPanel /></div>}
        {activeTab === 'advertising' && <div className="animate-fade-in"><AdminAdvertisingPanel /></div>}
        {activeTab === 'sales' && <div className="animate-fade-in"><AdminSales /></div>}
      </div>
    </div>
  )
}
