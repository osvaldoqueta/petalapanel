import { useState } from 'react'
import { X, AlertTriangle, UploadCloud, Video, Leaf, DollarSign, Weight } from 'lucide-react'
import { merchantRepository } from '@/repositories/merchantRepository'
import type { StoreInventory } from '@/shared/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProductFormModalProps {
  storeId: string
  product?: StoreInventory | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ProductFormModal({ storeId, product, isOpen, onClose, onSuccess }: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || '',
    plant_species: product?.plant_species || '',
    price: product?.price?.toString() || '',
    weight_kg: product?.weight_kg?.toString() || '0.500',
    image_url: product?.image_url || '',
    video_url: product?.video_url || '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await merchantRepository.upsertProduct(storeId, product?.id || null, {
        name: formData.name,
        plant_species: formData.plant_species,
        price: Number(formData.price),
        weight_kg: Number(formData.weight_kg),
        image_url: formData.image_url,
        video_url: formData.video_url,
      })
      toast.success(product ? 'Produto atualizado' : 'Produto criado', { id: 'prod' })
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar produto', { id: 'prod' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRejected = product?.video_moderation_status === 'rejected'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-surface-800/30">
          <div>
            <h2 className="text-lg font-bold text-white">
              {product ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">Gestão de inventário e mídia</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800/50 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Moderation Alert */}
          {isRejected && (
            <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-rose shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-accent-rose">Vídeo Rejeitado pela Moderação</h4>
                <p className="text-xs text-red-200/70 mt-1">
                  {product?.video_moderation_reason || 'Seu vídeo foi marcado como inadequado.'}
                </p>
                <p className="text-[10px] text-red-300 mt-2">
                  Altere a URL do vídeo abaixo e salve para reenviar para análise.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nome */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Nome Comercial</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Monstera Deliciosa Pote 15"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <Leaf className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* Espécie */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Espécie Botânica</label>
              <input
                required
                type="text"
                value={formData.plant_species}
                onChange={e => setFormData({ ...formData, plant_species: e.target.value })}
                placeholder="Monstera deliciosa"
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>

            {/* Preço */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Preço (R$)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* Peso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Peso para Frete (Kg)</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.weight_kg}
                  onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                  placeholder="0.500"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <Weight className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* Imagem */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-wider">URL da Imagem</label>
              <div className="relative">
                <input
                  required
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
                />
                <UploadCloud className="absolute left-3.5 top-3 h-4 w-4 text-surface-500" />
              </div>
            </div>

            {/* Video */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center justify-between text-xs font-semibold text-surface-300 uppercase tracking-wider">
                <span>URL do Vídeo</span>
                <span className="text-[10px] text-surface-500 font-normal normal-case bg-surface-800/50 px-2 py-0.5 rounded-full">
                  Sujeito à moderação IA
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className={cn(
                    "w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2.5 px-4 pl-10 text-sm text-white placeholder:text-surface-600 focus:outline-none transition-all",
                    isRejected ? "border-accent-rose focus:border-accent-rose focus:ring-1 focus:ring-accent-rose" : "focus:border-petala-500 focus:ring-1 focus:ring-petala-500"
                  )}
                />
                <Video className={cn(
                  "absolute left-3.5 top-3 h-4 w-4 transition-colors",
                  isRejected ? "text-accent-rose" : "text-surface-500"
                )} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800/30">
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
                  Salvando...
                </>
              ) : (
                'Salvar Produto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
