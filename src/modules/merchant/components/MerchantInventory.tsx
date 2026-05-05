import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { useStoreContext } from '@/modules/merchant/hooks/useStoreContext'
import { TableSkeleton } from '@/components/Skeleton'
import { ProductFormModal } from '@/modules/merchant/components/ProductFormModal'
import { Plus, Search, Edit2, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { StoreInventory } from '@/shared/types'

export function MerchantInventory() {
  const { storeId } = useStoreContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StoreInventory | null>(null)

  const { data: inventory, isLoading, refetch } = useQuery<StoreInventory[]>({
    queryKey: ['merchant-inventory', storeId],
    queryFn: () => merchantRepository.getInventory(storeId),
    enabled: !!storeId,
  })

  const filteredInventory = useMemo(() => {
    if (!inventory) return []
    if (!searchTerm) return inventory
    
    const lowerSearch = searchTerm.toLowerCase()
    return inventory.filter(item => 
      (item.name && item.name.toLowerCase().includes(lowerSearch)) ||
      (item.plant_species && item.plant_species.toLowerCase().includes(lowerSearch))
    )
  }, [inventory, searchTerm])

  const openEditModal = (product: StoreInventory) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const getModerationIcon = (status: string | null) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-petala-400" />
    if (status === 'rejected') return <AlertTriangle className="h-4 w-4 text-accent-rose" />
    if (status === 'pending') return <Clock className="h-4 w-4 text-accent-amber" />
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-4 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por nome ou espécie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 px-4 pl-10 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 transition-all"
          />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-surface-500" />
        </div>
        <button
          onClick={openNewModal}
          className="w-full sm:w-auto gradient-primary px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-surface-800/50 bg-surface-900/20">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Produto</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Espécie</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Preço</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-surface-500">Status Moderação</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-surface-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/20">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-surface-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-surface-700 bg-surface-800" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-surface-800 flex items-center justify-center text-xs text-surface-500 border border-surface-700">Sem Foto</div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">{item.name}</p>
                            {item.is_promoted && (
                              <span className="text-[9px] bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Patrocinado</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-300 italic">{item.plant_species}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.video_url ? (
                          <div className="flex items-center justify-center gap-1.5" title={item.video_moderation_reason || ''}>
                            {getModerationIcon(item.video_moderation_status)}
                            <span className={cn(
                              "text-xs font-medium uppercase tracking-wider",
                              item.video_moderation_status === 'approved' && "text-petala-400",
                              item.video_moderation_status === 'rejected' && "text-accent-rose",
                              item.video_moderation_status === 'pending' && "text-accent-amber"
                            )}>
                              {item.video_moderation_status || 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-surface-500">Sem vídeo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-surface-400 hover:text-white hover:bg-surface-800/50 rounded-xl transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && storeId && (
        <ProductFormModal
          storeId={storeId}
          product={editingProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}
