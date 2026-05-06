import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, AlertTriangle, UploadCloud, Video, Leaf, DollarSign, Weight, Tag, Image as ImageIcon, Sparkles, Clock, Calendar } from 'lucide-react'
import { merchantRepository } from '@/repositories/merchantRepository'
import { supabase } from '@/integrations/supabase/client'
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
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ─── Categories ───
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: merchantRepository.getCategories,
    enabled: isOpen
  })
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    plant_species: product?.plant_species || '',
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    price: product?.price?.toString() || '',
    stock_qty: product?.stock_qty?.toString() || '1',
    weight_kg: product?.weight_kg?.toString() || '0.500',
    ai_description: product?.ai_description || '',
    is_active: product?.is_active ?? true,
    original_price: product?.original_price?.toString() || '',
    badge: 'Novidade', // Visual mock
    is_flash_sale: product?.is_flash_sale || false,
    flash_sale_ends_at: product?.flash_sale_ends_at ? new Date(product.flash_sale_ends_at).toISOString().slice(0, 16) : '',
    image_url: product?.image_url || '',
    video_url: product?.video_url || '',
  })

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', formData.category],
    queryFn: () => merchantRepository.getSubcategories(formData.category),
    enabled: !!formData.category && isOpen
  })

  if (!isOpen) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${storeId}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('plant-images')
        .upload(filePath, file)
        
      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('plant-images')
        .getPublicUrl(filePath)
        
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }))
      toast.success('Imagem carregada com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao fazer upload da imagem')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Gemini IA Copy + Identificar ───
  const handleIACopy = async () => {
    if (!formData.image_url) {
      toast.error('Adicione uma foto primeiro para a IA analisar')
      return
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      toast.error('Chave do Gemini não configurada')
      return
    }

    setIsGenerating(true)
    try {
      const resImg = await fetch(formData.image_url)
      const blob = await resImg.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const categoriesInfo = categories.map((c: any) => c.id).join(', ')

      const prompt = `Você é um especialista em identificação de produtos e copywriter profissional para o marketplace Pétala (Brasil).
Analise esta imagem de produto. O produto pode ser uma planta, flor, insumo, ferramenta, vaso, etc.

Responda APENAS com um JSON válido, sem markdown, exatamente neste formato:
{
  "scientific_name": "Nome científico ou técnico completo do produto",
  "popular_name": "Nome popular mais usado no Brasil para este produto",
  "description": "Descrição de vendas irresistível de 2-3 frases. Seja poético, evocativo. Foque nos benefícios emocionais e visuais.",
  "category_id": "O ID da categoria mais adequada desta lista: ${categoriesInfo || 'plantas, flores, acessórios, ferramentas, insumos, sementes, vasos, diversos'}"
}`

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } }] }],
          generationConfig: { temperature: 0.7 }
        })
      })

      if (!res.ok) throw new Error('Falha na API da IA')
      
      const data = await res.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      
      let cleanText = rawText.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim()
      const parsed = JSON.parse(cleanText)

      setFormData(prev => ({
        ...prev,
        plant_species: parsed.scientific_name || prev.plant_species,
        name: parsed.popular_name || prev.name,
        ai_description: parsed.description || prev.ai_description,
        category: parsed.category_id || prev.category
      }))
      
      toast.success('Informações geradas com IA!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao processar imagem com a IA')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Calculate discount
    let discount = null
    const original = Number(formData.original_price)
    const current = Number(formData.price)
    if (original > current) {
      discount = Math.round(((original - current) / original) * 100)
    }

    try {
      await merchantRepository.upsertProduct(storeId, product?.id || null, {
        name: formData.name,
        plant_species: formData.plant_species,
        price: current,
        weight_kg: Number(formData.weight_kg),
        stock_qty: Number(formData.stock_qty),
        image_url: formData.image_url,
        video_url: formData.video_url,
        ai_description: formData.ai_description,
        is_active: formData.is_active,
        original_price: formData.original_price ? original : null,
        discount_percent: discount,
        is_flash_sale: formData.is_flash_sale,
        flash_sale_ends_at: formData.is_flash_sale && formData.flash_sale_ends_at 
          ? new Date(formData.flash_sale_ends_at).toISOString() 
          : null,
        category: formData.category,
        subcategory: formData.subcategory,
      })
      toast.success(product ? 'Produto atualizado' : 'Produto adicionado ao estoque', { id: 'prod' })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl animate-slide-up flex flex-col bg-surface-950">
        <div className="flex items-center justify-between p-5 border-b border-surface-800/30 sticky top-0 bg-surface-950/80 backdrop-blur z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {product ? 'Editar Produto' : 'Adicionar Produto'}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">Até 3 fotos · IA identifica a planta e gera a descrição</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800/50 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-8 flex-1 overflow-y-auto">
          
          {/* Moderation Alert */}
          {isRejected && (
            <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-rose shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-accent-rose">Vídeo Rejeitado pela Moderação</h4>
                <p className="text-xs text-red-200/70 mt-1">
                  {product?.video_moderation_reason || 'Seu vídeo foi marcado como inadequado.'}
                </p>
              </div>
            </div>
          )}

          {/* Fotos do Produto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-surface-300">
              <span className="text-white">Fotos do Produto <span className="text-accent-rose">*</span></span>
              <span>{formData.image_url ? '1' : '0'}/3</span>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-surface-700 hover:border-petala-500 bg-surface-900/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group min-h-[160px]"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              
              {formData.image_url ? (
                <>
                  <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center gap-2 bg-surface-950/80 px-4 py-2 rounded-xl backdrop-blur-sm">
                    <ImageIcon className="h-6 w-6 text-white" />
                    <span className="text-sm font-medium text-white">Alterar foto</span>
                  </div>
                </>
              ) : isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-2 border-petala-500/30 border-t-petala-500 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-petala-500">Enviando imagem...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-surface-400 group-hover:text-petala-400 transition-colors">
                  <ImageIcon className="h-8 w-8" />
                  <p className="text-sm font-medium">Toque para adicionar fotos</p>
                  <p className="text-xs opacity-70">Até 3 fotos (JPEG, PNG)</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Espécie */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-white">Nome Científico / Espécie <span className="text-accent-rose">*</span></label>
              <input
                required
                type="text"
                value={formData.plant_species}
                onChange={e => setFormData({ ...formData, plant_species: e.target.value })}
                placeholder="ex: Monstera deliciosa"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>

            {/* Nome Popular */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-white">Nome Popular / Apelido</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Costela-de-adão"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Categoria <span className="text-accent-rose">*</span></label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all appearance-none"
              >
                <option value="" disabled>Selecione a categoria</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {/* Subcategoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Subcategoria <span className="text-accent-rose">*</span></label>
              <select
                required
                value={formData.subcategory}
                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                disabled={!formData.category}
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all appearance-none disabled:opacity-50"
              >
                <option value="" disabled>Selecione a subcategoria</option>
                {subcategories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Preço */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white truncate">Preço (R$) <span className="text-accent-rose">*</span></label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="29,90"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>

            {/* Qtd Estoque */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white truncate">Estoque <span className="text-accent-rose">*</span></label>
              <input
                required
                type="number"
                step="1"
                min="0"
                value={formData.stock_qty}
                onChange={e => setFormData({ ...formData, stock_qty: e.target.value })}
                placeholder="1"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>

            {/* Peso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white truncate">Peso (kg) <span className="text-accent-rose">*</span></label>
              <input
                required
                type="number"
                step="0.001"
                min="0.001"
                value={formData.weight_kg}
                onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="0,500"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all"
              />
            </div>
            <p className="col-span-3 text-[10px] text-surface-500">
              O peso é usado para calcular o frete com precisão — vaso, terra e embalagem inclusos.
            </p>
          </div>

          {/* Descrição de Venda */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white">Descrição de Venda</label>
              <button 
                type="button" 
                onClick={handleIACopy}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-medium text-[#C084FC] hover:brightness-125 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="h-3.5 w-3.5 border-[1.5px] border-[#C084FC]/30 border-t-[#C084FC] rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating ? 'Analisando...' : 'IA Copy + Identificar'}
              </button>
            </div>
            <textarea
              value={formData.ai_description}
              onChange={e => setFormData({ ...formData, ai_description: e.target.value })}
              placeholder="Uma descrição encantadora aparecerá aqui após a IA processar sua foto..."
              rows={4}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC] transition-all resize-none"
            />
          </div>

          {/* Ativo Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-900 rounded-xl border border-surface-800">
            <div>
              <p className="text-sm font-bold text-white">Produto ativo na loja</p>
              <p className="text-xs text-surface-400">Oculto para os compradores se inativo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.is_active}
                onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-petala-500"></div>
            </label>
          </div>

          {/* PROMOÇÃO E DESTAQUE */}
          <div className="bg-gradient-to-b from-[#FFFDF5]/5 to-transparent border border-[#FDE68A]/20 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-[#FBBF24]">
              <Tag className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Promoção e Destaque</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Preço Original (De)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.original_price}
                  onChange={e => setFormData({ ...formData, original_price: e.target.value })}
                  placeholder="Ex: 38,99"
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-[#FBBF24] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Badge (ex: Oferta)</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={e => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Novidade, Mais Vend..."
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-[#FBBF24] transition-all"
                />
              </div>
              <div className="col-span-2 text-[10px] text-surface-400">
                Preencha "Preço Original" e o "Preço" acima para calcular o desconto automaticamente.
              </div>
            </div>

            <hr className="border-surface-800/50" />

            {/* Oferta Relâmpago Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#FBBF24]">Ativar Oferta Relâmpago</p>
                <p className="text-xs text-surface-400">Destaca o produto com cronômetro na vitrine inicial</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.is_flash_sale}
                  onChange={e => setFormData(p => ({ ...p, is_flash_sale: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FBBF24]"></div>
              </label>
            </div>

            {formData.is_flash_sale && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-semibold text-[#FBBF24]">Término da Oferta *</label>
                <div className="relative">
                  <input
                    required={formData.is_flash_sale}
                    type="datetime-local"
                    value={formData.flash_sale_ends_at}
                    onChange={e => setFormData({ ...formData, flash_sale_ends_at: e.target.value })}
                    className="w-full bg-surface-900 border border-[#FDE68A]/30 rounded-xl py-3 px-4 pl-10 text-sm text-white focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-all"
                  />
                  <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-[#FBBF24]" />
                </div>
              </div>
            )}
          </div>

          {/* Vídeo YouTube */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-accent-rose">
              <Video className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Vídeo YouTube <span className="text-surface-500 font-medium normal-case">(opcional)</span></h3>
            </div>
            <input
              type="url"
              value={formData.video_url}
              onChange={e => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=... ou link .mp4"
              className={cn(
                "w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-surface-500 focus:outline-none transition-all",
                isRejected ? "border-accent-rose focus:border-accent-rose focus:ring-1 focus:ring-accent-rose" : "focus:border-accent-rose focus:ring-1 focus:ring-accent-rose"
              )}
            />
            <p className="text-[10px] text-surface-500 mt-1">
              Aceita links do YouTube ou .mp4/.webm próprios. O vídeo aparecerá no Feed Marketplace.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full gradient-primary py-3.5 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                product ? 'Salvar Alterações' : 'Adicionar ao Estoque'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-bold text-surface-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
