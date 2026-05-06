/**
 * AdminPage — Hub de administração SuperAdmin com tabs.
 */
import { useState, useTransition } from 'react'
import { UserManagement } from '@/modules/admin/components/UserManagement'
import { GlobalModeration } from '@/modules/admin/components/GlobalModeration'
import { MarketplaceSettings } from '@/modules/admin/components/MarketplaceSettings'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Users, Shield, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminTab = 'users' | 'moderation' | 'settings'

export default function AdminPage() {
  const { hasRole } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [isPending, startTransition] = useTransition()

  const handleTab = (tab: AdminTab) => startTransition(() => setActiveTab(tab))

  const tabs = [
    { key: 'users' as const, label: 'Usuários', icon: Users, minRole: 'Super User' as const },
    { key: 'moderation' as const, label: 'Moderação', icon: Shield, minRole: 'Support' as const },
    { key: 'settings' as const, label: 'Configurações', icon: Settings, minRole: 'Super User' as const },
  ].filter(t => hasRole(t.minRole))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administração</h1>
          <p className="text-sm text-surface-400 mt-0.5">Gestão de usuários, moderação e configurações</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-800/50 p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => handleTab(t.key)} className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key ? 'bg-surface-800 text-white shadow-sm' : 'text-surface-400 hover:text-white'
            )}>
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={cn('transition-opacity duration-200', isPending && 'opacity-50')}>
        {activeTab === 'users' && <div className="animate-fade-in"><UserManagement /></div>}
        {activeTab === 'moderation' && <div className="animate-fade-in"><GlobalModeration /></div>}
        {activeTab === 'settings' && <div className="animate-fade-in"><MarketplaceSettings /></div>}
      </div>
    </div>
  )
}
