/**
 * ConfigRow — Linha editável para cada key/value do app_config.
 * Suporta tipos: color, boolean, string.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Pencil } from 'lucide-react'
import type { AppConfigRow } from '@/shared/types'

interface ConfigRowProps {
  config: AppConfigRow
  onSave: (key: string, newValue: string, oldValue: string) => Promise<void>
}

function detectType(key: string, value: string): 'color' | 'boolean' | 'string' {
  // Color detection
  if (/^#[0-9a-fA-F]{3,8}$/.test(value) || key.includes('color') || key.includes('cor')) {
    return 'color'
  }
  // Boolean detection
  if (value === 'true' || value === 'false') {
    return 'boolean'
  }
  return 'string'
}

export function ConfigRow({ config, onSave }: ConfigRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(config.value)
  const [isSaving, setIsSaving] = useState(false)
  const type = detectType(config.key, config.value)

  const handleSave = async () => {
    if (draft === config.value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    await onSave(config.key, draft, config.value)
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(config.value)
    setIsEditing(false)
  }

  return (
    <tr className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors group">
      {/* Key */}
      <td className="px-4 py-3">
        <code className="text-xs font-mono text-petala-400/80 bg-petala-500/5 px-2 py-0.5 rounded-md">
          {config.key}
        </code>
      </td>

      {/* Value */}
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {type === 'color' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-8 w-8 rounded-lg border border-surface-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-28 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-petala-500/50"
                />
              </div>
            ) : type === 'boolean' ? (
              <button
                onClick={() => setDraft(draft === 'true' ? 'false' : 'true')}
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors',
                  draft === 'true' ? 'bg-petala-500' : 'bg-surface-700'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                    draft === 'true' ? 'left-[22px]' : 'left-0.5'
                  )}
                />
              </button>
            ) : (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-sm text-white outline-none focus:border-petala-500/50"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {type === 'color' && (
              <span
                className="inline-block h-5 w-5 rounded-md border border-surface-700 flex-shrink-0"
                style={{ backgroundColor: config.value }}
              />
            )}
            {type === 'boolean' ? (
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                config.value === 'true'
                  ? 'bg-petala-500/10 text-petala-400'
                  : 'bg-surface-800 text-surface-500'
              )}>
                {config.value}
              </span>
            ) : (
              <span className="text-sm text-surface-300 font-mono">{config.value}</span>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-petala-500/10 text-petala-400 hover:bg-petala-500/20 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-petala-400 border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleCancel}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:text-white hover:bg-surface-800/50 transition-all opacity-0 group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
