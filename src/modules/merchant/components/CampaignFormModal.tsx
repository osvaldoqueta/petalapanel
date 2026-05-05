import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Megaphone, DollarSign, MousePointer, Package } from 'lucide-react'
import { merchantRepository } from '@/repositories/merchantRepository'
import type { StoreInventory } from '@/shared/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CampaignFormModalProps {
  storeId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CampaignFormModal({ storeId, isOpen, onClose, onSuccess }: CampaignFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    budget: '100',
    cpc: '0.50'
  })
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Fetch inventory to link products
  const { data: inventory, isLoading } = useQuery<StoreInventory[]>({
    queryKey: ['merchant-inventory', storeId],
    queryFn: () => merchantRepository.getInventory(storeId),
    enabled: isOpen && !!storeId,
  })

  if (!isOpen) return null

  const toggleProduct = (id: string) => {
    const newSet = new Set(selectedProducts)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedProducts(newSet)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto para patrocinar.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create campaign
      const campaign = await merchantRepository.createCampaign(storeId, {
        name: formData.name,
        budget: Number(formData.budget),
        cpc: Number(formData.cpc)
      })

      // 2. Link products
      await merchantRepository.linkProductsToCampaign(
        storeId,
        campaign.id,
        Array.from(selectedProducts)
      )

      toast.success('Campanha criada com sucesso!', { id: 'camp' })
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar campanha.', { id: 'camp' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl animate-slide-up flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-800/30 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Nova Campanha Patrocinada</h2>
            <p className="text-xs text-surface-400 mt-0.5">Impulsione seus produtos no Pétala</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800/50 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-5 gap-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
            {/* Nome */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Nome da Campanha</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Primavera 2026"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <Megaphone className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Orçamento Total (R$)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="1"
                  min="10"
                  value={formData.budget}
                  onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="100.00"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* CPC */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Max. CPC (R$)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.05"
                  value={formData.cpc}
                  onChange={e => setFormData({ ...formData, cpc: e.target.value })}
                  placeholder="0.50"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <MousePointer className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[200px] border border-surface-800/50 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-surface-800/50 bg-surface-900/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-surface-400" />
                <h3 className="text-sm font-semibold text-white">Vincular Produtos</h3>
              </div>
              <span className="text-xs font-medium text-petala-400 bg-petala-500/10 px-2 py-0.5 rounded-full">
                {selectedProducts.size} selecionados
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="p-4 text-center text-surface-500 text-sm">Carregando produtos...</div>
              ) : inventory?.length === 0 ? (
                <div className="p-4 text-center text-surface-500 text-sm">Nenhum produto cadastrado.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inventory?.map(product => {
                    const isSelected = selectedProducts.has(product.id)
                    return (
                      <div 
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all",
                          isSelected 
                            ? "border-petala-500 bg-petala-500/10" 
                            : "border-surface-800/50 hover:bg-surface-800 hover:border-surface-700"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-sm border flex items-center justify-center transition-colors shrink-0",
                          isSelected ? "bg-petala-500 border-petala-500" : "border-surface-600"
                        )}>
                          {isSelected && <div className="h-2 w-2 bg-surface-950 rounded-[1px]" />}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          {product.image_url && (
                            <img src={product.image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                          )}
                          <p className="text-sm text-white font-medium truncate">{product.name}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800/30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-surface-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="gradient-primary px-6 py-2 rounded-xl text-sm font-semibold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                'Iniciar Campanha'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
