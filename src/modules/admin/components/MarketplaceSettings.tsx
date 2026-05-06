/**
 * MarketplaceSettings — Configuração de taxas da plataforma.
 */
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRepository } from '@/repositories/adminRepository'
import { useAuditLog } from '@/hooks/useAuditLog'
import { toast } from 'sonner'
import type { SalesSettings } from '@/shared/types'
import { Settings, Save, Percent, DollarSign } from 'lucide-react'

export function MarketplaceSettings() {
  const { log } = useAuditLog()
  const qc = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ store_fee: '10.00', courier_fee: '85.00' })

  const { data: settings, isLoading } = useQuery<SalesSettings | null>({
    queryKey: ['sales-settings'],
    queryFn: adminRepository.getSalesSettings,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        store_fee: settings.store_fee_percentage?.toString() || '10.00',
        courier_fee: settings.courier_fee_percentage?.toString() || '85.00',
      })
    }
  }, [settings])

  const platformSaleFee = (100 - Number(form.store_fee)).toFixed(2)
  const platformDeliveryFee = (100 - Number(form.courier_fee)).toFixed(2)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const storeFee = Number(form.store_fee)
      const courierFee = Number(form.courier_fee)

      if (storeFee < 0 || storeFee > 100 || courierFee < 0 || courierFee > 100) {
        toast.error('Percentuais devem estar entre 0 e 100')
        return
      }

      await adminRepository.updateSalesSettings({
        store_fee_percentage: storeFee,
        courier_fee_percentage: courierFee,
      })

      await log({
        action: 'settings_update',
        table_name: 'sales_settings',
        record_key: '1',
        old_value: JSON.stringify({ store: settings?.store_fee_percentage, courier: settings?.courier_fee_percentage }),
        new_value: JSON.stringify({ store: storeFee, courier: courierFee }),
        entity: 'sales_settings',
      })

      toast.success('Configurações salvas com sucesso!')
      qc.invalidateQueries({ queryKey: ['sales-settings'] })
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'Desconhecido'}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-800/50 rounded-lg" />
        <div className="h-12 w-full bg-surface-800/50 rounded-xl" />
        <div className="h-12 w-full bg-surface-800/50 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass p-4 rounded-2xl flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-accent-cyan" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Configurações do Marketplace</h2>
          <p className="text-xs text-surface-400">Taxas de comissão e regras da plataforma</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Percent className="h-4 w-4 text-accent-amber" />
          Taxas de Comissão
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Fee */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Taxa do Lojista (%)</label>
            <p className="text-[10px] text-surface-500">Percentual que o lojista recebe sobre cada venda</p>
            <input
              type="number" step="0.01" min="0" max="100"
              value={form.store_fee}
              onChange={e => setForm(p => ({ ...p, store_fee: e.target.value }))}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
            />
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3 text-petala-400" />
              <span className="text-surface-400">Plataforma retém: <strong className="text-petala-400">{platformSaleFee}%</strong></span>
            </div>
          </div>

          {/* Courier Fee */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Taxa do Entregador (%)</label>
            <p className="text-[10px] text-surface-500">Percentual que o entregador recebe sobre a entrega</p>
            <input
              type="number" step="0.01" min="0" max="100"
              value={form.courier_fee}
              onChange={e => setForm(p => ({ ...p, courier_fee: e.target.value }))}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
            />
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3 text-petala-400" />
              <span className="text-surface-400">Plataforma retém: <strong className="text-petala-400">{platformDeliveryFee}%</strong></span>
            </div>
          </div>
        </div>

        <hr className="border-surface-800/50" />

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 gradient-primary px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
