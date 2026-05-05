/**
 * ThemeCard — Card visual para edição de tema sazonal.
 * Permite alterar cores (primary, secondary, accent), radius e toggle override.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Sun, Snowflake, Flower2, Leaf, Zap } from 'lucide-react'
import type { AppTheme } from '@/shared/types'

interface ThemeCardProps {
  theme: AppTheme
  onSave: (id: string, updates: Partial<AppTheme>) => Promise<void>
}

const SEASON_META: Record<string, { icon: React.ReactNode; gradient: string }> = {
  primavera: { icon: <Flower2 className="h-5 w-5" />, gradient: 'from-pink-500/20 to-rose-500/20' },
  verao: { icon: <Sun className="h-5 w-5" />, gradient: 'from-amber-500/20 to-orange-500/20' },
  outono: { icon: <Leaf className="h-5 w-5" />, gradient: 'from-orange-500/20 to-red-500/20' },
  inverno: { icon: <Snowflake className="h-5 w-5" />, gradient: 'from-blue-500/20 to-cyan-500/20' },
}

export function ThemeCard({ theme, onSave }: ThemeCardProps) {
  const [draft, setDraft] = useState({ ...theme })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const seasonKey = theme.season_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const meta = SEASON_META[seasonKey] || { icon: <Zap className="h-5 w-5" />, gradient: 'from-petala-500/20 to-emerald-500/20' }
  const hasChanges = draft.primary_color !== theme.primary_color ||
    draft.secondary_color !== theme.secondary_color ||
    draft.accent_color !== theme.accent_color ||
    draft.button_radius !== theme.button_radius

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(theme.id, {
      primary_color: draft.primary_color,
      secondary_color: draft.secondary_color,
      accent_color: draft.accent_color,
      button_radius: draft.button_radius,
    })
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleToggleOverride = async () => {
    setIsSaving(true)
    await onSave(theme.id, { is_active_override: !theme.is_active_override })
    setIsSaving(false)
  }

  const handleCancel = () => {
    setDraft({ ...theme })
    setIsEditing(false)
  }

  return (
    <div className={cn(
      'glass rounded-2xl overflow-hidden transition-all duration-300',
      theme.is_active_override && 'ring-2 ring-petala-500/50 shadow-glow-sm'
    )}>
      {/* Header gradient */}
      <div className={cn('bg-gradient-to-r p-4 flex items-center justify-between', meta.gradient)}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            {meta.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white capitalize">{theme.season_name}</h4>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              {theme.is_active_override ? '● Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleOverride}
          disabled={isSaving}
          className={cn(
            'relative h-7 w-12 rounded-full transition-colors disabled:opacity-50',
            theme.is_active_override ? 'bg-petala-500' : 'bg-surface-700'
          )}
        >
          <span className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
            theme.is_active_override ? 'left-[22px]' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Color previews */}
      <div className="p-4 space-y-4">
        {/* Color swatches row */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Primary', key: 'primary_color' as const },
            { label: 'Secondary', key: 'secondary_color' as const },
            { label: 'Accent', key: 'accent_color' as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex-1">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1.5">{label}</p>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={(e) => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    className="h-8 w-8 rounded-lg border border-surface-700 cursor-pointer bg-transparent flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={draft[key]}
                    onChange={(e) => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-surface-700 bg-surface-900 px-2 py-1 text-[10px] font-mono text-white outline-none focus:border-petala-500/50"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="h-7 w-7 rounded-lg border border-surface-700 flex-shrink-0"
                    style={{ backgroundColor: theme[key] }}
                  />
                  <span className="text-xs text-surface-400 font-mono">{theme[key]}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Radius */}
        <div>
          <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1.5">Border Radius</p>
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.125"
                value={parseFloat(draft.button_radius) || 0.5}
                onChange={(e) => setDraft(prev => ({ ...prev, button_radius: `${e.target.value}rem` }))}
                className="flex-1 accent-petala-500"
              />
              <span className="text-xs font-mono text-surface-400 w-14 text-right">{draft.button_radius}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-16 border-2 border-surface-600 bg-surface-800"
                style={{ borderRadius: theme.button_radius }}
              />
              <span className="text-xs text-surface-400 font-mono">{theme.button_radius}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/30">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all"
              >
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-petala-500/10 text-petala-400 hover:bg-petala-500/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-petala-400 border-t-transparent" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Salvar
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-surface-500 hover:text-petala-400 transition-colors"
            >
              Editar cores
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
