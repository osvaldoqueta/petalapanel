/**
 * FeatureFlagRow — Toggle animado para feature flags da app_config.
 * Exibe label descritiva, toggle visual e badge de status.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Zap, Shield, Megaphone, type LucideIcon } from 'lucide-react'

interface FeatureFlagRowProps {
  configKey: string
  value: string
  onToggle: (key: string, newValue: string, oldValue: string) => Promise<void>
}

const FLAG_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  flash_sale_active: {
    label: 'Ofertas Relâmpago',
    description: 'Ativa globalmente a seção de Flash Sales na vitrine do marketplace',
    icon: Zap,
  },
  maintenance_mode: {
    label: 'Modo Manutenção',
    description: 'Desabilita o acesso de clientes ao aplicativo durante manutenções programadas',
    icon: Shield,
  },
  welcome_banner: {
    label: 'Banner de Boas-vindas',
    description: 'Exibe o banner promocional de boas-vindas para novos usuários',
    icon: Megaphone,
  },
}

export function FeatureFlagRow({ configKey, value, onToggle }: FeatureFlagRowProps) {
  const [isSaving, setIsSaving] = useState(false)
  const isActive = value === 'true'
  const meta = FLAG_META[configKey] || {
    label: configKey,
    description: 'Flag de configuração do sistema',
    icon: Zap,
  }
  const Icon = meta.icon

  const handleToggle = async () => {
    setIsSaving(true)
    const newVal = isActive ? 'false' : 'true'
    await onToggle(configKey, newVal, value)
    setIsSaving(false)
  }

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-surface-800/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          isActive ? 'bg-petala-500/10 text-petala-400' : 'bg-surface-800/50 text-surface-500'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{meta.label}</p>
          <p className="text-xs text-surface-500 mt-0.5 max-w-xs">{meta.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
          isActive ? 'bg-petala-500/10 text-petala-400' : 'bg-surface-800 text-surface-500'
        )}>
          {isActive ? 'Ativo' : 'Inativo'}
        </span>
        <button
          onClick={handleToggle}
          disabled={isSaving}
          className={cn(
            'relative h-7 w-12 rounded-full transition-colors disabled:opacity-50',
            isActive ? 'bg-petala-500' : 'bg-surface-700'
          )}
        >
          {isSaving ? (
            <span className="absolute top-1 left-1/2 -translate-x-1/2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <span className={cn(
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
              isActive ? 'left-[22px]' : 'left-0.5'
            )} />
          )}
        </button>
      </div>
    </div>
  )
}
