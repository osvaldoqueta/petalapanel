import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Loader2, Save, X, ShoppingBag, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { affiliateRepository, AffiliateProduct } from '@/repositories/affiliateRepository';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// Note: We don't have react-i18next in petalapanel normally, but let's use strings directly or i18n if it exists.
// From other components in petalapanel, they use hardcoded Portuguese strings. I will hardcode Portuguese strings here.

const PAGE_SIZE = 20;

const CATEGORIES = [
  { value: '_default', emoji: '🌍' },
  { value: 'fertilizante', emoji: '🧪' },
  { value: 'fungicida', emoji: '🦠' },
  { value: 'inseticida', emoji: '🐛' },
  { value: 'substrato', emoji: '🪨' },
  { value: 'vaso', emoji: '🪴' },
  { value: 'ferramenta', emoji: '🛠️' },
  { value: 'irrigação', emoji: '💧' },
  { value: 'iluminação', emoji: '💡' },
  { value: 'suporte', emoji: '🌿' },
  { value: 'poda', emoji: '✂️' },
  { value: 'umidade', emoji: '🌫️' },
  { value: 'replantio', emoji: '♻️' },
  { value: 'suculenta', emoji: '🌵' },
  { value: 'orquídea', emoji: '🌸' },
  { value: 'samambaia', emoji: '🌿' },
  { value: 'tropical', emoji: '🏝️' },
];

const EMOJI_OPTIONS = [
  '🌱', '🪴', '✂️', '💧', '🧪', '🛠️', '🪵', '🐛', '🦠', '🪨', '💡',
  '🌿', '🌫️', '♻️', '🌵', '🌸', '🏝️', '💐', '🌴', '🌻', '🎁', '🛒', '🌍', '🏺', '🚿'
];

const emptyProduct = (): Omit<AffiliateProduct, 'id'> => ({
  speciesKey: '_default',
  name: '',
  description: '',
  imageEmoji: '🌱',
  affiliateUrl: '',
  tag: null,
  sortOrder: 0,
  isActive: true,
});

export function AdminAffiliateProducts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<(Omit<AffiliateProduct, 'id'> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const [page, setPage] = useState(1);
  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin_affiliate_products', page],
    queryFn: async () => {
      const { products: fetchedProducts, total } = await affiliateRepository.getAllProducts(page, PAGE_SIZE);
      return { fetchedProducts, total };
    }
  });

  const products = data?.fetchedProducts || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.speciesKey || !editing.name || !editing.affiliateUrl) {
      toast.error('Preencha os campos obrigatórios (Categoria, Nome, URL)');
      return;
    }
    setSaving(true);
    try {
      await affiliateRepository.upsertProduct(editing);
      toast.success('Produto afiliado salvo com sucesso');
      setEditing(null);
      setUseCustomCategory(false);
      queryClient.invalidateQueries({ queryKey: ['admin_affiliate_products'] });
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${name}'?`)) return;
    setDeleting(id);
    try {
      await affiliateRepository.deleteProduct(id);
      toast.success(`'${name}' excluído com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['admin_affiliate_products'] });
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (product: AffiliateProduct) => {
    setEditing({ ...product });
    const isPredefined = CATEGORIES.some(c => c.value === product.speciesKey);
    setUseCustomCategory(!isPredefined);
  };

  const handleAdd = () => {
    setEditing(emptyProduct());
    setUseCustomCategory(false);
  };

  const speciesGroups = products.reduce<Record<string, AffiliateProduct[]>>((acc, p) => {
    (acc[p.speciesKey] = acc[p.speciesKey] || []).push(p);
    return acc;
  }, {});

  const getCategoryLabel = (key: string) => {
    if (key === '_default') return 'Geral / Manutenção';
    const cat = CATEGORIES.find(c => c.value === key);
    return cat ? `${cat.emoji} ${key}` : key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between glass p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-petala-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Produtos Afiliados</h2>
            <p className="text-xs text-surface-400">Total: {totalCount}</p>
          </div>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 bg-petala-500 hover:bg-petala-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {editing && (
        <div className="glass p-5 rounded-2xl border border-surface-700 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-surface-800/50 pb-3">
            <h4 className="text-sm font-bold text-white">
              {editing.id ? 'Editando Produto' : 'Novo Produto Afiliado'}
            </h4>
            <button onClick={() => { setEditing(null); setUseCustomCategory(false); }} className="text-surface-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-xs text-surface-400 font-medium">Categoria / Espécie-Alvo</label>
              {!useCustomCategory ? (
                <select
                  value={editing.speciesKey}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setUseCustomCategory(true);
                      setEditing({ ...editing, speciesKey: '' });
                    } else {
                      setEditing({ ...editing, speciesKey: e.target.value });
                    }
                  }}
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} className="bg-surface-900">
                      {c.emoji} {c.value === '_default' ? 'Geral / Manutenção' : c.value}
                    </option>
                  ))}
                  <option value="__custom__" className="bg-surface-900">✏️ Outra (Personalizada)</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite a categoria/espécie..."
                    value={editing.speciesKey}
                    onChange={e => setEditing({ ...editing, speciesKey: e.target.value.toLowerCase() })}
                    className="flex-1 bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
                  />
                  <button
                    onClick={() => { setUseCustomCategory(false); setEditing({ ...editing, speciesKey: '_default' }); }}
                    className="p-2 bg-surface-800/50 hover:bg-surface-700 rounded-xl border border-surface-700 text-surface-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs text-surface-400 font-medium">Nome do Produto</label>
              <input
                type="text"
                placeholder="Ex: Fertilizante NPK 10-10-10"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs text-surface-400 font-medium">Descrição Curta</label>
              <input
                type="text"
                placeholder="Ex: Ideal para crescimento de folhagens"
                value={editing.description}
                onChange={e => setEditing({ ...editing, description: e.target.value })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-surface-400 font-medium">Emoji da Imagem</label>
              <select
                value={editing.imageEmoji || "🌱"}
                onChange={e => setEditing({ ...editing, imageEmoji: e.target.value })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              >
                {EMOJI_OPTIONS.map(emoji => (
                  <option key={emoji} value={emoji} className="bg-surface-900">
                    Mídia: {emoji}
                  </option>
                ))}
                {editing.imageEmoji && !EMOJI_OPTIONS.includes(editing.imageEmoji) && (
                  <option value={editing.imageEmoji} className="bg-surface-900">
                    Mídia: {editing.imageEmoji}
                  </option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-surface-400 font-medium">Tag (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Mais vendido"
                value={editing.tag ?? ''}
                onChange={e => setEditing({ ...editing, tag: e.target.value || null })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs text-surface-400 font-medium">URL de Afiliado</label>
              <input
                type="url"
                placeholder="https://..."
                value={editing.affiliateUrl}
                onChange={e => setEditing({ ...editing, affiliateUrl: e.target.value })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-surface-400 font-medium">Ordem de Exibição</label>
              <input
                type="number"
                value={editing.sortOrder}
                onChange={e => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:border-petala-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={editing.isActive}
                  onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <div className="w-9 h-5 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-petala-500"></div>
                <span className="ml-2 text-xs font-medium text-surface-300">Ativo na vitrine</span>
              </label>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full flex justify-center items-center gap-2 bg-petala-500 hover:bg-petala-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors mt-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>
      )}

      {Object.entries(speciesGroups).map(([key, items]) => (
        <div key={key} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-surface-800/50 pb-2">
            <h4 className="text-sm font-bold text-white capitalize">{getCategoryLabel(key)}</h4>
            <span className="text-[10px] bg-surface-800 text-surface-400 px-2 py-0.5 rounded-full">
              {items.length} item(s)
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(product => (
              <div 
                key={product.id} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                  product.isActive ? "glass border-surface-700 hover:border-surface-600" : "bg-surface-900/50 border-surface-800 opacity-60"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-surface-800/80 flex items-center justify-center text-2xl shrink-0">
                  {product.imageEmoji}
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white truncate">{product.name}</p>
                    {product.tag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-petala-500/20 text-petala-400 shrink-0">
                        {product.tag}
                      </span>
                    )}
                    {!product.isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-400 truncate mb-2">{product.description}</p>
                  
                  <div className="flex items-center gap-1.5">
                    <a 
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                      title="Abrir Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button 
                      onClick={() => handleEdit(product)} 
                      className="p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-petala-400 hover:bg-petala-500/10 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deleting === product.id}
                      className="p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir"
                    >
                      {deleting === product.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="text-center py-16 glass rounded-2xl border border-surface-800/50">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-surface-600" />
          <p className="text-surface-400 font-medium">Nenhum produto afiliado cadastrado.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
            className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </button>
          <span className="text-sm text-surface-400 font-medium">
            Página {page} de {totalPages}
          </span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700"
          >
            Próxima
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
