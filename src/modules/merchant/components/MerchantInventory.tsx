import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { useStoreContext } from '@/modules/merchant/context/StoreContext'
import { useAuditLog } from '@/hooks/useAuditLog'
import { TableSkeleton } from '@/components/Skeleton'
import { ProductFormModal } from '@/modules/merchant/components/ProductFormModal'
import { Plus, Search, Edit2, AlertTriangle, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { StoreInventory } from '@/shared/types'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { toast } from 'sonner'

function InlineEditInput({ 
  initialValue, 
  onSave, 
  type = 'number',
  prefix = ''
}: { 
  initialValue: number | string; 
  onSave: (val: string) => Promise<void>;
  type?: 'number' | 'text';
  prefix?: string;
}) {
  const [value, setValue] = useState(initialValue.toString())
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleBlur = async () => {
    setIsEditing(false)
    if (value !== initialValue.toString()) {
      setIsSaving(true)
      try {
        await onSave(value)
      } catch {
        setValue(initialValue.toString())
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <div className="relative group flex items-center justify-center">
      {isSaving && (
        <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded">
          <Clock className="h-3 w-3 animate-spin text-petala-400" />
        </div>
      )}
      <div className={cn(
        "flex items-center gap-1 border-b border-transparent hover:border-surface-600 transition-colors px-1",
        isEditing && "border-petala-500 bg-surface-800 rounded hover:border-petala-500"
      )}>
        {prefix && <span className={cn("text-xs", isEditing ? "text-petala-400" : "text-surface-500")}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "bg-transparent focus:outline-none text-center text-sm font-medium w-16",
            isEditing ? "text-white" : "text-white"
          )}
        />
      </div>
    </div>
  )
}

export function MerchantInventory() {
  const { storeId } = useStoreContext()
  const { log } = useAuditLog()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StoreInventory | null>(null)
  
  const [productToDelete, setProductToDelete] = useState<StoreInventory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkModifying, setIsBulkModifying] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredInventory.map(item => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkStatus = async (isActive: boolean) => {
    if (!storeId || selectedIds.length === 0) return
    setIsBulkModifying(true)
    try {
      await merchantRepository.bulkUpdateStatus(storeId, selectedIds, isActive)
      toast.success(`Produtos ${isActive ? 'ativados' : 'inativados'} com sucesso`)
      setSelectedIds([])
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar status em massa')
    } finally {
      setIsBulkModifying(false)
    }
  }

  const confirmBulkDelete = async () => {
    if (!storeId || selectedIds.length === 0) return
    setIsBulkModifying(true)
    try {
      await merchantRepository.bulkDeleteProducts(storeId, selectedIds)
      toast.success('Produtos excluídos com sucesso')
      setSelectedIds([])
      setShowBulkDeleteConfirm(false)
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir produtos em massa')
    } finally {
      setIsBulkModifying(false)
    }
  }

  const handleDelete = async () => {
    if (!productToDelete || !storeId) return
    setIsDeleting(true)
    try {
      await merchantRepository.deleteProduct(storeId, productToDelete.id)
      // Audit log
      await log({
        action: 'product_delete',
        table_name: 'store_inventory',
        record_key: productToDelete.id,
        old_value: productToDelete.name,
        new_value: null,
        entity: 'store_inventory',
        store_id: storeId,
      })
      toast.success('Produto excluído com sucesso')
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir produto')
    } finally {
      setIsDeleting(false)
      setProductToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-4 rounded-2xl min-h-[72px]">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-4 w-full animate-fade-in">
            <span className="text-sm font-bold text-petala-400 whitespace-nowrap">
              {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <button 
                onClick={() => handleBulkStatus(true)}
                disabled={isBulkModifying}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-800 text-white hover:bg-surface-700 transition-colors disabled:opacity-50"
              >
                Ativar
              </button>
              <button 
                onClick={() => handleBulkStatus(false)}
                disabled={isBulkModifying}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-800 text-white hover:bg-surface-700 transition-colors disabled:opacity-50"
              >
                Inativar
              </button>
              <div className="flex-1" />
              <button 
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkModifying}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20 transition-colors disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-surface-800/50 bg-surface-900/20">
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-surface-700 text-petala-500 focus:ring-petala-500 bg-surface-900"
                      checked={filteredInventory.length > 0 && selectedIds.length === filteredInventory.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Produto</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Espécie</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-surface-500">Preço</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-surface-500">Estoque</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-surface-500">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-surface-500">Vídeo IA</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-surface-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/20">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-surface-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className={cn(
                      "hover:bg-surface-800/20 transition-colors",
                      !item.is_active && "opacity-60 grayscale",
                      selectedIds.includes(item.id) && "bg-petala-500/5"
                    )}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-surface-700 text-petala-500 focus:ring-petala-500 bg-surface-900"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-surface-700 bg-surface-800" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-surface-800 flex items-center justify-center text-xs text-surface-500 border border-surface-700">Sem Foto</div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">{item.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.is_promoted && (
                                <span className="text-[9px] bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Patrocinado</span>
                              )}
                              {item.is_flash_sale && (
                                <span className="text-[9px] bg-accent-rose/10 text-accent-rose px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Oferta Relâmpago</span>
                              )}
                              {item.discount_percent && item.discount_percent > 0 ? (
                                <span className="text-[9px] bg-[#FBBF24]/10 text-[#FBBF24] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">-{item.discount_percent}% OFF</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-300 italic">{item.plant_species}</td>
                      <td className="px-4 py-3">
                        <InlineEditInput 
                          initialValue={item.price} 
                          prefix="R$"
                          onSave={async (val) => {
                            if (!storeId) return
                            await merchantRepository.quickUpdateProduct(storeId, item.id, { price: Number(val) })
                            toast.success('Preço atualizado')
                            refetch()
                          }} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <InlineEditInput 
                          initialValue={item.stock_qty || 0} 
                          onSave={async (val) => {
                            if (!storeId) return
                            await merchantRepository.quickUpdateProduct(storeId, item.id, { stock_qty: Number(val) })
                            toast.success('Estoque atualizado')
                            refetch()
                          }} 
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          item.is_active ? "bg-petala-500/10 text-petala-400" : "bg-surface-800 text-surface-500"
                        )}>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
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
                          <span className="text-xs text-surface-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800/50 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(item)}
                            className="p-2 text-surface-400 hover:text-accent-rose hover:bg-accent-rose/10 rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!productToDelete}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setProductToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={showBulkDeleteConfirm}
        title="Excluir Múltiplos Produtos"
        description={`Você está prestes a excluir ${selectedIds.length} produtos permanentemente. Esta ação não pode ser desfeita.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        isDeleting={isBulkModifying}
      />
    </div>
  )
}
