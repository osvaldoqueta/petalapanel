/**
 * AdminAdvertisingPanel — Sprint 10.13 Ads v2
 *
 * Tabs:
 *  1. Banners      — CRUD de home_banners com preview ao vivo
 *  2. Campanhas    — Criar/gerenciar ad_campaigns por formato e placement
 *  3. Produtos     — Produtos patrocinados via store_inventory
 *  4. Analytics    — Impressões, cliques, CTR, budget burn
 *
 * CWV:
 *  • Skeleton loaders com altura fixa (CLS = 0)
 *  • useCallback em handlers (INP mínimo)
 *  • staleTime 60s em todas as queries
 *  • Select explícito — sem select('*')
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PremiumDatePicker } from './ui/premium-date-picker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Megaphone, TrendingUp, DollarSign, Pause, Play, Trash2,
  Tag, Star, Zap, Plus, X, Calendar, Image, Eye, EyeOff,
  BarChart3, MousePointerClick, Layers, CheckSquare, ChevronDown,
  Sparkles, Globe, Home, ShoppingBag, Leaf, Search, Upload,
  AlertCircle, Pencil, Link2, ExternalLink, ToggleLeft,
  ToggleRight, Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdCampaign {
  id: string;
  store_id: string;
  name: string;
  budget_total: number;
  budget_spent: number;
  cpc: number;
  status: 'active' | 'paused' | 'ended' | 'pending';
  ad_format: 'product_card' | 'banner' | 'spotlight' | 'native';
  placements: string[];
  impressions: number;
  clicks: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  stores?: { name: string };
}

interface HomeBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  action_url: string | null;
  bg_color: string;
  accent_color: string;
  badge_text: string | null;
  sort_order: number;
  is_active: boolean;
  placement: 'home' | 'vitrine' | 'my_plants' | 'local';
  overlay_style: 'color_wash' | 'gradient' | 'dark' | 'none';
  impressions: number;
  clicks: number;
  starts_at: string | null;
  ends_at: string | null;
  store_id: string | null;
  stores?: { name: string };
}

interface StoreOption { id: string; name: string; }

interface PromotedProduct {
  id: string;
  plant_name: string;
  plant_species: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  badge_text: string | null;
  is_promoted: boolean;
  ad_priority: number;
  promo_ends_at: string | null;
  stores?: { name: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const statusColor = (s: string) => ({
  active:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  paused:  'bg-amber-500/20  text-amber-400  border-amber-500/30',
  ended:   'bg-gray-500/20   text-gray-400   border-gray-500/30',
  pending: 'bg-blue-500/20   text-blue-400   border-blue-500/30',
} as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground';

const formatLabel = (f: string) => ({
  product_card: '🃏 Card de Produto',
  banner:       '🖼️ Banner Rotativo',
  spotlight:    '✨ Spotlight (Oferta)',
  native:       '📋 Nativo (entre itens)',
} as Record<string, string>)[f] ?? f;

const placementLabel = (p: string) => ({
  home:      '🏠 Home',
  vitrine:   '🛍️ Vitrine Global',
  my_plants: '🌿 Minhas Plantas',
  local:     '📍 Marketplace Local',
} as Record<string, string>)[p] ?? p;

const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) + '%' : '—';

// ─── StoreCombobox — busca por nome ──────────────────────────────────────────

function StoreCombobox({
  stores,
  value,
  onChange,
}: {
  stores: StoreOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = stores.find(s => s.id === value);
  const filtered = query.trim()
    ? stores.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : stores.slice(0, 20);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center h-9 px-3 border border-border bg-background rounded-lg cursor-pointer gap-2"
        onClick={() => { setOpen(o => !o); if (!open) setQuery(''); }}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Digite o nome da loja..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
            {selected ? selected.name : 'Selecionar loja...'}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma loja encontrada</p>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                className={`w-full text-left text-sm px-3 py-2 hover:bg-muted/50 transition-colors ${s.id === value ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}`}
                onClick={() => { onChange(s.id); setOpen(false); setQuery(''); }}
              >
                {s.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlacementChips — seleção múltipla de placements ─────────────────────────

const ALL_PLACEMENTS = ['home', 'vitrine', 'my_plants', 'local'] as const;
const PLACEMENT_ICONS: Record<string, any> = {
  home: Home, vitrine: ShoppingBag, my_plants: Leaf, local: Globe,
};

function PlacementChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (p: string) =>
    onChange(value.includes(p) ? value.filter(x => x !== p) : [...value, p]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_PLACEMENTS.map(p => {
        const Icon = PLACEMENT_ICONS[p];
        const active = value.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
              active
                ? 'bg-primary/15 border-primary text-primary font-medium'
                : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            <Icon className="w-3 h-3" />
            {placementLabel(p).split(' ').slice(1).join(' ')}
            {active && <CheckSquare className="w-2.5 h-2.5 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── App Routes — rotas internas do Pétala ───────────────────────────────────

const APP_ROUTES = [
  { value: '/local',              label: '📍 Marketplace Local' },
  { value: '/marketplace/map',   label: '🗺️ Mapa de Lojas' },
  { value: '/showcase',          label: '🛍️ Vitrine Global' },
  { value: '/diagnose',          label: '🔬 Diagnóstico IA' },
  { value: '/',                  label: '🌿 Minhas Plantas' },
  { value: '/more',              label: '🔭 Explorar' },
  { value: '/admin/store/new',   label: '🏪 Cadastrar Loja Parceira' },
  { value: '/courier/dashboard', label: '🛵 Painel Entregador' },
  { value: '/perfil/pedidos',    label: '📦 Meus Pedidos' },
  { value: '/settings',          label: '⚙️ Configurações' },
  { value: '_external',          label: '🌐 URL Externa (https://...)' },
] as const;

// ─── Dimensões ideais por placement ─────────────────────────────────────────

const PLACEMENT_DIMS: Record<string, { w: number; h: number; ratio: string; maxKb: number; tip: string }> = {
  home:      { w: 800, h: 280, ratio: '~16:5.6', maxKb: 200, tip: 'Banner largo — ocupa 140px de altura no carrossel da Home' },
  vitrine:   { w: 400, h: 220, ratio: '~16:9',   maxKb: 150, tip: 'Card de destaque entre produtos da Vitrine Global' },
  my_plants: { w: 400, h: 220, ratio: '~16:9',   maxKb: 150, tip: 'Card entre as plantas do usuário' },
  local:     { w: 800, h: 280, ratio: '~16:5.6', maxKb: 200, tip: 'Banner no topo do Marketplace Local' },
};

function DimHint({ placement }: { placement: string }) {
  const d = PLACEMENT_DIMS[placement];
  if (!d) return null;
  return (
    <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
      <Ruler className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
      <div className="text-[11px] text-blue-300 leading-relaxed">
        <p className="font-semibold mb-0.5">Dimensões ideais — {placementLabel(placement)}</p>
        <p>{d.w} × {d.h} px · proporção {d.ratio} · JPG ou WebP · máx {d.maxKb} KB</p>
        <p className="opacity-70 mt-0.5">{d.tip}</p>
      </div>
    </div>
  );
}

// ─── ImageUploadField — upload para Supabase Storage ─────────────────────────

function ImageUploadField({
  value,
  onChange,
  placement,
}: {
  value: string;
  onChange: (url: string) => void;
  placement: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dims = PLACEMENT_DIMS[placement];

  const handleFile = useCallback(async (file: File) => {
    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo inválido — use JPG, PNG ou WebP');
      return;
    }
    // Validate size (5MB hard cap)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande — máximo 5 MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `banners/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('plant-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('plant-images').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Imagem enviada com sucesso ✅');
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err.message || 'tente novamente'));
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer overflow-hidden
          ${value ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 bg-muted/20'}
        `}
        style={{ minHeight: 100 }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          disabled={uploading}
        />

        {value ? (
          /* Preview da imagem enviada */
          <div className="relative group">
            <img
              src={value}
              alt="banner preview"
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: 120 }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <p className="text-white text-xs font-medium flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Trocar imagem
              </p>
            </div>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Enviando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-1.5">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Upload className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground">Clique ou arraste a imagem aqui</p>
            <p className="text-[11px] text-muted-foreground">
              {dims ? `${dims.w}×${dims.h}px recomendado · ` : ''}JPG, PNG ou WebP
            </p>
          </div>
        )}
      </div>

      {/* Remover imagem */}
      {value && !uploading && (
        <button
          type="button"
          className="text-[11px] text-destructive/70 hover:text-destructive flex items-center gap-0.5 transition-colors"
          onClick={e => { e.stopPropagation(); onChange(''); }}
        >
          <X className="w-3 h-3" /> Remover imagem
        </button>
      )}
    </div>
  );
}

// ─── ActionUrlField — selector de rota + URL externa ─────────────────────────

function ActionUrlField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Detect if current value is an external URL or matches a known route
  const isKnownRoute = APP_ROUTES.some(r => r.value !== '_external' && r.value === value);
  const isExternal = value.startsWith('http');
  const selectValue = isExternal ? '_external' : isKnownRoute ? value : value ? '_external' : '';

  const handleSelectChange = (v: string) => {
    if (v === '_external') {
      onChange('https://');
    } else {
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="h-9 text-sm border-border bg-background">
          <SelectValue placeholder="Selecionar destino..." />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {APP_ROUTES.map(r => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* External URL input */}
      {(selectValue === '_external' || isExternal) && (
        <div className="relative">
          <ExternalLink className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="https://example.com/pagina"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-9 text-sm border-border bg-background pl-9"
          />
        </div>
      )}

      {/* Show selected internal route */}
      {selectValue && selectValue !== '_external' && !isExternal && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Rota interna: <code className="bg-muted px-1 rounded font-mono">{value}</code>
        </p>
      )}
    </div>
  );
}

// ─── OverlayStylePicker — seletor visual de estilo de overlay ────────────────

const OVERLAY_OPTIONS: {
  value: HomeBanner['overlay_style'];
  label: string;
  desc: string;
  preview: string; // tailwind classes para mini-preview
}[] = [
  { value: 'color_wash',  label: 'Color Wash',   desc: 'Cor de fundo mescla com a imagem', preview: 'bg-emerald-800 opacity-80' },
  { value: 'gradient',    label: 'Gradient',     desc: 'Escuro à esquerda, claro à direita', preview: 'bg-gradient-to-r from-black to-transparent' },
  { value: 'dark',        label: 'Dark',         desc: 'Overlay escuro uniforme', preview: 'bg-black/60' },
  { value: 'none',        label: 'Nenhum',       desc: 'Imagem limpa — só texto com sombra', preview: 'bg-transparent border border-white/20' },
];

function OverlayStylePicker({
  value,
  onChange,
  bgColor,
  imageUrl,
}: {
  value: string;
  onChange: (v: HomeBanner['overlay_style']) => void;
  bgColor: string;
  imageUrl: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OVERLAY_OPTIONS.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
              isActive ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)]' : 'border-border hover:border-primary/40'
            }`}
            style={{ height: 70 }}
          >
            {/* Mini image */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover ${
                  opt.value === 'color_wash' ? 'mix-blend-overlay opacity-60' : 'opacity-100'
                }`}
              />
            )}
            {/* Bg color */}
            <div className="absolute inset-0" style={{ backgroundColor: opt.value === 'color_wash' ? bgColor : 'transparent' }} />
            {/* Overlay */}
            {opt.value === 'color_wash'  && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />}
            {opt.value === 'gradient'    && <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />}
            {opt.value === 'dark'        && <div className="absolute inset-0 bg-black/55" />}
            {opt.value === 'none'        && <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />}
            {/* Fallback bg se não tiver imagem */}
            {!imageUrl && <div className="absolute inset-0" style={{ backgroundColor: bgColor, opacity: opt.value === 'color_wash' ? 1 : 0.3 }} />}
            {/* Label */}
            <div className="absolute inset-0 flex flex-col justify-end p-1.5">
              <p className="text-white text-[10px] font-bold drop-shadow">{opt.label}</p>
              <p className="text-white/70 text-[9px] leading-tight drop-shadow">{opt.desc}</p>
            </div>
            {/* Active check */}
            {isActive && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">✓</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── BannerPreview — preview animado com overlay correto ────────────────────

function BannerPreview({ banner }: { banner: Partial<HomeBanner> & { title: string } }) {
  const style = (banner.overlay_style ?? 'color_wash') as HomeBanner['overlay_style'];
  const accent = banner.accent_color || '#fff';

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden select-none group"
      style={{ height: 100, backgroundColor: banner.bg_color || '#064e3b' }}
    >
      {/* Imagem com Ken Burns suave */}
      {banner.image_url && (
        <img
          src={banner.image_url}
          alt="preview"
          loading="lazy"
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-transform [transition-duration:6000ms] ease-out group-hover:scale-105
            ${style === 'color_wash' ? 'mix-blend-overlay opacity-60' : 'opacity-100'}
          `}
        />
      )}

      {/* Overlay por estilo */}
      {style === 'color_wash' && <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />}
      {style === 'gradient'   && <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />}
      {style === 'dark'       && <div className="absolute inset-0 bg-black/55" />}
      {style === 'none'       && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />}

      {/* Borda sutil */}
      <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />

      {/* Conteúdo */}
      <div className="relative z-10 p-3 h-full flex flex-col justify-between">
        <div>
          {banner.badge_text && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: accent, border: `1px solid ${accent}40` }}
            >
              ✦ {banner.badge_text}
            </span>
          )}
          <p
            className="text-[13px] font-extrabold leading-tight"
            style={{ color: accent, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
          >
            {banner.title || 'Título do Banner'}
          </p>
          {banner.subtitle && (
            <p className="text-[10px] opacity-85 leading-tight mt-0.5" style={{ color: accent }}>
              {banner.subtitle}
            </p>
          )}
        </div>
        {/* Overlay style badge */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/50 uppercase tracking-wider">
            {OVERLAY_OPTIONS.find(o => o.value === style)?.label ?? style}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── BannerListCard ───────────────────────────────────────────────────────────

function BannerListCard({
  banner: b,
  onEdit,
  onToggle,
  onDelete,
  isDeleting,
  isToggling,
}: {
  banner: HomeBanner;
  onEdit: (b: HomeBanner) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className={`bg-card border-border overflow-hidden transition-opacity ${!b.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-3 space-y-2.5">

        {/* Banner preview */}
        <BannerPreview banner={b} />

        {/* Info row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">{b.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">
                {placementLabel(b.placement)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                b.is_active
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/50 text-muted-foreground border-border'
              }`}>
                {b.is_active ? '● Ativo' : '○ Inativo'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {(b.impressions ?? 0).toLocaleString('pt-BR')} imp.</span>
              <span className="flex items-center gap-0.5"><MousePointerClick className="w-3 h-3" /> {(b.clicks ?? 0).toLocaleString('pt-BR')} cliques</span>
              <span>CTR: {ctr(b.clicks ?? 0, b.impressions ?? 0)}</span>
            </div>
            {b.stores?.name && (
              <p className="text-[10px] text-muted-foreground">Loja: {b.stores.name}</p>
            )}
          </div>
        </div>

        {/* Action bar */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            <p className="text-xs text-destructive flex-1">Confirmar exclusão?</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs text-muted-foreground"
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { onDelete(b.id); setConfirmDelete(false); }}
              disabled={isDeleting}
            >
              {isDeleting ? '...' : 'Excluir'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-0.5 border-t border-border">
            {/* Toggle ativo */}
            <Button
              size="sm"
              variant="outline"
              className={`h-7 flex-1 text-xs border-border gap-1 ${
                b.is_active
                  ? 'text-muted-foreground hover:text-amber-400 hover:border-amber-500/40'
                  : 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
              }`}
              onClick={() => onToggle(b.id, !b.is_active)}
              disabled={isToggling}
            >
              {b.is_active
                ? <><EyeOff className="w-3 h-3" /> Desativar</>
                : <><Eye className="w-3 h-3" /> Ativar</>}
            </Button>

            {/* Editar */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs border-border gap-1 hover:border-primary/40 hover:text-primary"
              onClick={() => onEdit(b)}
            >
              <Pencil className="w-3 h-3" /> Editar
            </Button>

            {/* Deletar */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setConfirmDelete(true)}
              title="Excluir banner"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="h-28 rounded-xl bg-muted/30 animate-pulse" />
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type MainTab = 'banners' | 'campaigns' | 'products' | 'analytics' | 'flash_sale';

export const AdminAdvertisingPanel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MainTab>('banners');
  const { flashSaleActive } = useAppConfig();

  // ── Campaigns state ────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    store_id: '',
    name: '',
    budget_total: '',
    cpc: '1.00',
    ad_format: 'product_card' as AdCampaign['ad_format'],
    placements: ['vitrine'] as string[],
    starts_at: TODAY,
    ends_at: '',
  });

  // ── Banners state ──────────────────────────────────────────────────────────
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    action_url: '',
    bg_color: '#064e3b',
    accent_color: '#ffffff',
    badge_text: '',
    sort_order: '0',
    placement: 'home' as HomeBanner['placement'],
    overlay_style: 'color_wash' as HomeBanner['overlay_style'],
    starts_at: '',
    ends_at: '',
    store_id: '',
    is_active: true,
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['admin_ad_campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ad_campaigns') as any)
        .select('id,store_id,name,budget_total,budget_spent,cpc,status,ad_format,placements,impressions,clicks,starts_at,ends_at,created_at,stores(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AdCampaign[];
    },
    staleTime: 60_000,
  });

  const { data: banners = [], isLoading: loadingBanners } = useQuery({
    queryKey: ['admin_home_banners'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('home_banners') as any)
        .select('id,title,subtitle,image_url,action_url,bg_color,accent_color,badge_text,sort_order,is_active,placement,overlay_style,impressions,clicks,starts_at,ends_at,store_id,stores(name)')
        .order('sort_order', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data as HomeBanner[];
    },
    staleTime: 60_000,
    enabled: activeTab === 'banners',
  });

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['admin_stores_list'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('stores') as any)
        .select('id,name')
        .order('name')
        .limit(300);
      if (error) throw error;
      return data as StoreOption[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: promotedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin_promoted_products'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('store_inventory') as any)
        .select('id,plant_name,plant_species,price,original_price,discount_percent,badge_text,is_promoted,ad_priority,promo_ends_at,stores(name)')
        .or('is_promoted.eq.true,discount_percent.gt.0')
        .order('ad_priority', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PromotedProduct[];
    },
    staleTime: 60_000,
    enabled: activeTab === 'products',
  });

  // ── Analytics derivadas ────────────────────────────────────────────────────
  const totalImpressions = campaigns.reduce((s, c) => s + Number(c.impressions ?? 0), 0)
    + banners.reduce((s, b) => s + Number(b.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + Number(c.clicks ?? 0), 0)
    + banners.reduce((s, b) => s + Number(b.clicks ?? 0), 0);
  const totalBudget  = campaigns.reduce((s, c) => s + Number(c.budget_total), 0);
  const totalSpent   = campaigns.reduce((s, c) => s + Number(c.budget_spent), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  // ── Mutations — Campaigns ──────────────────────────────────────────────────

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!campaignForm.store_id || !campaignForm.name || !campaignForm.budget_total)
        throw new Error('Preencha todos os campos obrigatórios.');
      const payload: any = {
        store_id: campaignForm.store_id,
        name: campaignForm.name.trim(),
        budget_total: parseFloat(campaignForm.budget_total),
        budget_spent: 0,
        cpc: parseFloat(campaignForm.cpc || '1.00'),
        status: 'active',
        ad_format: campaignForm.ad_format,
        placements: campaignForm.placements,
        starts_at: campaignForm.starts_at || TODAY,
        impressions: 0,
        clicks: 0,
      };
      if (campaignForm.ends_at) payload.ends_at = campaignForm.ends_at;
      const { error } = await (supabase.from('ad_campaigns') as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_ad_campaigns'] });
      toast.success('Campanha criada com sucesso! 🚀');
      setShowCampaignForm(false);
      setCampaignForm({ store_id: '', name: '', budget_total: '', cpc: '1.00', ad_format: 'product_card', placements: ['vitrine'], starts_at: TODAY, ends_at: '' });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar campanha'),
  });

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('ad_campaigns') as any).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_ad_campaigns'] });
      toast.success('Campanha atualizada');
    },
    onError: () => toast.error('Erro ao atualizar campanha'),
  });

  // ── Mutations — Banners ────────────────────────────────────────────────────

  const upsertBanner = useMutation({
    mutationFn: async () => {
      if (!bannerForm.title) throw new Error('Título é obrigatório.');
      const payload: any = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || null,
        image_url: bannerForm.image_url.trim() || null,
        action_url: bannerForm.action_url.trim() || null,
        bg_color: bannerForm.bg_color || '#064e3b',
        accent_color: bannerForm.accent_color || '#ffffff',
        badge_text: bannerForm.badge_text.trim() || null,
        sort_order: parseInt(bannerForm.sort_order) || 0,
        placement: bannerForm.placement,
        overlay_style: bannerForm.overlay_style,
        is_active: bannerForm.is_active,
        store_id: bannerForm.store_id || null,
        starts_at: bannerForm.starts_at || null,
        ends_at: bannerForm.ends_at || null,
      };
      if (editingBanner) {
        const { error } = await (supabase.from('home_banners') as any).update(payload).eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('home_banners') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_home_banners'] });
      queryClient.invalidateQueries({ queryKey: ['home_banners'] }); // invalidate consumer
      toast.success(editingBanner ? 'Banner atualizado! ✨' : 'Banner criado! ✨');
      closeBannerForm();
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar banner'),
  });

  const toggleBannerActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('home_banners') as any).update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_home_banners'] });
      queryClient.invalidateQueries({ queryKey: ['home_banners'] });
    },
    onError: () => toast.error('Erro ao alterar status do banner'),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('home_banners') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_home_banners'] });
      queryClient.invalidateQueries({ queryKey: ['home_banners'] });
      toast.success('Banner removido');
    },
    onError: () => toast.error('Erro ao remover banner'),
  });

  // ── Mutations — Products ───────────────────────────────────────────────────

  const removePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('store_inventory') as any)
        .update({ is_promoted: false, ad_priority: 0, discount_percent: null, badge_text: null, original_price: null, promo_ends_at: null, ad_campaign_id: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_promoted_products'] });
      toast.success('Promoção removida');
    },
    onError: () => toast.error('Erro ao remover promoção'),
  });

  // ── Banner form helpers ────────────────────────────────────────────────────

  const openBannerEdit = useCallback((b: HomeBanner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle || '',
      image_url: b.image_url || '',
      action_url: b.action_url || '',
      bg_color: b.bg_color,
      accent_color: b.accent_color,
      badge_text: b.badge_text || '',
      sort_order: String(b.sort_order),
      placement: b.placement,
      overlay_style: b.overlay_style ?? 'color_wash',
      starts_at: b.starts_at ? b.starts_at.slice(0, 10) : '',
      ends_at: b.ends_at ? b.ends_at.slice(0, 10) : '',
      store_id: b.store_id || '',
      is_active: b.is_active,
    });
    setShowBannerForm(true);
  }, []);

  const closeBannerForm = useCallback(() => {
    setShowBannerForm(false);
    setEditingBanner(null);
    setBannerForm({ title: '', subtitle: '', image_url: '', action_url: '', bg_color: '#064e3b', accent_color: '#ffffff', badge_text: '', sort_order: '0', placement: 'home', overlay_style: 'color_wash', starts_at: '', ends_at: '', store_id: '', is_active: true });
  }, []);

  // ── Filtered campaigns ─────────────────────────────────────────────────────
  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Métricas globais ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: Megaphone,         color: 'emerald', label: 'Campanhas Ativas', value: activeCampaigns },
          { icon: MousePointerClick, color: 'blue',    label: 'Cliques Totais',   value: totalClicks.toLocaleString('pt-BR') },
          { icon: BarChart3,         color: 'violet',  label: 'CTR Médio',        value: totalCTR + '%' },
          { icon: DollarSign,        color: 'amber',   label: 'Budget Investido', value: 'R$' + totalSpent.toFixed(0) },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5 min-h-[60px]">
            <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab strip ────────────────────────────────────────────────────────── */}
      <div className="flex bg-muted/30 rounded-xl p-1 gap-1">
        {([
          { key: 'flash_sale',label: 'Relâmpago', icon: Zap },
          { key: 'banners',   label: 'Banners',    icon: Image },
          { key: 'campaigns', label: 'Campanhas',  icon: Megaphone },
          { key: 'products',  label: 'Produtos',   icon: Tag },
          { key: 'analytics', label: 'Analytics',  icon: BarChart3 },
        ] as { key: MainTab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BANNERS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground"
              onClick={() => showBannerForm ? closeBannerForm() : setShowBannerForm(true)}
            >
              {showBannerForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showBannerForm ? 'Cancelar' : 'Novo Banner'}
            </Button>
            <p className="text-xs text-muted-foreground ml-auto">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Formulário banner */}
          {showBannerForm && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

              {/* Header do form */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {editingBanner ? '✏️ Editar Banner' : '🖼️ Novo Banner'}
                </p>
                {/* Switch Ativo / Inativo */}
                <button
                  type="button"
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    bannerForm.is_active
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-muted/30 border-border text-muted-foreground'
                  }`}
                  onClick={() => setBannerForm(f => ({ ...f, is_active: !f.is_active }))}
                >
                  {bannerForm.is_active
                    ? <><ToggleRight className="w-3.5 h-3.5" /> Ativo</>
                    : <><ToggleLeft className="w-3.5 h-3.5" /> Inativo</>}
                </button>
              </div>

              {/* Live preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Preview ao vivo</p>
                <BannerPreview banner={{ ...bannerForm, id: '', is_active: bannerForm.is_active, placement: bannerForm.placement, overlay_style: bannerForm.overlay_style, impressions: 0, clicks: 0, starts_at: null, ends_at: null, store_id: null }} />
              </div>

              {/* Dimensões ideais */}
              <DimHint placement={bannerForm.placement} />

              <div className="grid grid-cols-1 gap-3">

                {/* Título e Subtítulo */}
                <Field label="Título *">
                  <Input placeholder="Ex: Promoção de Primavera" value={bannerForm.title}
                    onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                </Field>
                <Field label="Subtítulo">
                  <Input placeholder="Ex: Ganhe até 50% de desconto" value={bannerForm.subtitle}
                    onChange={e => setBannerForm(f => ({ ...f, subtitle: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                </Field>

                {/* Upload de imagem */}
                <Field label="Imagem do Banner">
                  <ImageUploadField
                    value={bannerForm.image_url}
                    onChange={url => setBannerForm(f => ({ ...f, image_url: url }))}
                    placement={bannerForm.placement}
                  />
                </Field>

                {/* Destino */}
                <Field label="Destino ao clicar">
                  <ActionUrlField
                    value={bannerForm.action_url}
                    onChange={v => setBannerForm(f => ({ ...f, action_url: v }))}
                  />
                </Field>

                {/* Cores e Badge */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Cor de fundo">
                    <div className="flex items-center gap-2 h-9 px-2 border border-border bg-background rounded-lg cursor-pointer"
                      onClick={() => (document.getElementById('bg_color_picker') as HTMLInputElement)?.click()}>
                      <input id="bg_color_picker" type="color" value={bannerForm.bg_color}
                        onChange={e => setBannerForm(f => ({ ...f, bg_color: e.target.value }))}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs text-muted-foreground font-mono">{bannerForm.bg_color}</span>
                    </div>
                  </Field>
                  <Field label="Cor do texto">
                    <div className="flex items-center gap-2 h-9 px-2 border border-border bg-background rounded-lg cursor-pointer"
                      onClick={() => (document.getElementById('accent_color_picker') as HTMLInputElement)?.click()}>
                      <input id="accent_color_picker" type="color" value={bannerForm.accent_color}
                        onChange={e => setBannerForm(f => ({ ...f, accent_color: e.target.value }))}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs text-muted-foreground font-mono">{bannerForm.accent_color}</span>
                    </div>
                  </Field>
                  <Field label="Badge (ex: NOVO)">
                    <Input placeholder="OFERTA" value={bannerForm.badge_text}
                      onChange={e => setBannerForm(f => ({ ...f, badge_text: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                  </Field>
                </div>

                {/* Estilo do overlay */}
                <Field label="Estilo do overlay">
                  <OverlayStylePicker
                    value={bannerForm.overlay_style}
                    onChange={v => setBannerForm(f => ({ ...f, overlay_style: v }))}
                    bgColor={bannerForm.bg_color}
                    imageUrl={bannerForm.image_url}
                  />
                </Field>

                {/* Placement e Ordem */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Placement (onde aparece)">
                    <Select value={bannerForm.placement} onValueChange={v => setBannerForm(f => ({ ...f, placement: v as HomeBanner['placement'] }))}>
                      <SelectTrigger className="h-9 text-sm border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {ALL_PLACEMENTS.map(p => (
                          <SelectItem key={p} value={p}>{placementLabel(p)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Ordem (sort_order)">
                    <Input type="number" min="0" value={bannerForm.sort_order}
                      onChange={e => setBannerForm(f => ({ ...f, sort_order: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                  </Field>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início (opcional)">
                    <PremiumDatePicker 
                      value={bannerForm.starts_at}
                      onChange={date => setBannerForm(f => ({ ...f, starts_at: date }))} 
                      className="h-9" 
                    />
                  </Field>
                  <Field label="Fim (opcional)">
                    <PremiumDatePicker 
                      value={bannerForm.ends_at} 
                      minDate={bannerForm.starts_at ? new Date(bannerForm.starts_at) : undefined}
                      onChange={date => setBannerForm(f => ({ ...f, ends_at: date }))} 
                      className="h-9" 
                    />
                  </Field>
                </div>

                {/* Loja parceira */}
                <Field label="Loja parceira (opcional)">
                  <StoreCombobox
                    stores={stores}
                    value={bannerForm.store_id}
                    onChange={id => setBannerForm(f => ({ ...f, store_id: id }))}
                  />
                </Field>
              </div>

              <Button
                className="w-full h-10 bg-primary text-primary-foreground font-medium"
                onClick={() => upsertBanner.mutate()}
                disabled={upsertBanner.isPending || !bannerForm.title.trim()}
              >
                {upsertBanner.isPending ? 'Salvando...' : editingBanner ? '💾 Atualizar Banner' : '✨ Publicar Banner'}
              </Button>
            </div>
          )}

          {/* Lista banners */}
          {loadingBanners ? (
            <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : banners.length === 0 ? (
            <EmptyState icon={Image} title="Nenhum banner criado" sub='Clique em "Novo Banner" para criar o primeiro' />
          ) : (
            <div className="space-y-3">
              {banners.map(b => (
                <BannerListCard
                  key={b.id}
                  banner={b}
                  onEdit={openBannerEdit}
                  onToggle={(id, active) => toggleBannerActive.mutate({ id, is_active: active })}
                  onDelete={id => deleteBanner.mutate(id)}
                  isDeleting={deleteBanner.isPending}
                  isToggling={toggleBannerActive.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CAMPANHAS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground"
              onClick={() => setShowCampaignForm(v => !v)}
            >
              {showCampaignForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showCampaignForm ? 'Cancelar' : 'Nova Campanha'}
            </Button>
            <div className="flex-1" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 h-8 text-xs border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="ended">Encerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formulário campanha */}
          {showCampaignForm && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-sm font-semibold text-foreground">🚀 Nova Campanha de Publicidade</p>

              <Field label="Loja parceira *">
                {loadingStores ? (
                  <div className="h-9 rounded-lg bg-muted/30 animate-pulse" />
                ) : (
                  <StoreCombobox
                    stores={stores}
                    value={campaignForm.store_id}
                    onChange={id => setCampaignForm(f => ({ ...f, store_id: id }))}
                  />
                )}
              </Field>

              <Field label="Nome da campanha *">
                <Input placeholder="Ex: Promoção de Primavera" value={campaignForm.name}
                  onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm border-border bg-background" />
              </Field>

              <Field label="Formato do anúncio">
                <Select value={campaignForm.ad_format} onValueChange={v => setCampaignForm(f => ({ ...f, ad_format: v as AdCampaign['ad_format'] }))}>
                  <SelectTrigger className="h-9 text-sm border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="product_card">🃏 Card de Produto (Vitrine)</SelectItem>
                    <SelectItem value="banner">🖼️ Banner Rotativo (Home)</SelectItem>
                    <SelectItem value="spotlight">✨ Spotlight — Oferta do Dia</SelectItem>
                    <SelectItem value="native">📋 Nativo — Entre itens da lista</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Placements (onde aparece)</label>
                <PlacementChips
                  value={campaignForm.placements}
                  onChange={v => setCampaignForm(f => ({ ...f, placements: v }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget total (R$) *">
                  <Input type="number" min="0" step="0.01" placeholder="500.00" value={campaignForm.budget_total}
                    onChange={e => setCampaignForm(f => ({ ...f, budget_total: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                </Field>
                <Field label="CPC (R$/clique)">
                  <Input type="number" min="0.01" step="0.01" placeholder="1.00" value={campaignForm.cpc}
                    onChange={e => setCampaignForm(f => ({ ...f, cpc: e.target.value }))} className="h-9 text-sm border-border bg-background" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Início *">
                  <PremiumDatePicker 
                    value={campaignForm.starts_at}
                    onChange={date => setCampaignForm(f => ({ ...f, starts_at: date }))} 
                    className="h-9" 
                  />
                </Field>
                <Field label="Fim (opcional)">
                  <PremiumDatePicker 
                    value={campaignForm.ends_at} 
                    minDate={campaignForm.starts_at ? new Date(campaignForm.starts_at) : undefined}
                    onChange={date => setCampaignForm(f => ({ ...f, ends_at: date }))} 
                    className="h-9" 
                  />
                </Field>
              </div>

              <Button
                className="w-full h-9 bg-primary text-primary-foreground font-medium"
                onClick={() => createCampaign.mutate()}
                disabled={createCampaign.isPending}
              >
                {createCampaign.isPending ? 'Criando...' : '🚀 Publicar Campanha'}
              </Button>
            </div>
          )}

          {/* Lista campanhas */}
          {loadingCampaigns ? (
            <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : filteredCampaigns.length === 0 ? (
            <EmptyState icon={Megaphone} title="Nenhuma campanha encontrada" sub='Clique em "Nova Campanha" para publicar a primeira' />
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map(c => {
                const spent = Number(c.budget_spent);
                const budget = Number(c.budget_total);
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                return (
                  <Card key={c.id} className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.stores?.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">
                              {formatLabel(c.ad_format ?? 'product_card')}
                            </span>
                            {(c.placements ?? ['vitrine']).map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {placementLabel(p).split(' ')[0]} {p}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusColor(c.status)}`}>
                          {{ active: 'Ativa', paused: 'Pausada', ended: 'Encerrada', pending: 'Pendente' }[c.status]}
                        </span>
                      </div>

                      {/* Budget */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>R$ {spent.toFixed(2)} gastos</span>
                          <span>R$ {budget.toFixed(2)} budget</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] ${pct >= 90 ? 'bg-destructive' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% utilizado · CPC: R$ {Number(c.cpc).toFixed(2)}</p>
                      </div>

                      {/* Performance */}
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(c.impressions ?? 0).toLocaleString('pt-BR')} imp.</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {(c.clicks ?? 0).toLocaleString('pt-BR')} cliques</span>
                        <span>CTR: {ctr(c.clicks ?? 0, c.impressions ?? 0)}</span>
                      </div>

                      {/* Datas */}
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.starts_at).toLocaleDateString('pt-BR')}</span>
                        {c.ends_at && <span>→ {new Date(c.ends_at).toLocaleDateString('pt-BR')}</span>}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        {c.status === 'active' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-border flex-1"
                            onClick={() => updateCampaignStatus.mutate({ id: c.id, status: 'paused' })}
                            disabled={updateCampaignStatus.isPending}>
                            <Pause className="w-3 h-3 mr-1" /> Pausar
                          </Button>
                        )}
                        {(c.status === 'paused' || c.status === 'ended') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/50 text-emerald-400 flex-1"
                            onClick={() => updateCampaignStatus.mutate({ id: c.id, status: 'active' })}
                            disabled={updateCampaignStatus.isPending}>
                            <Play className="w-3 h-3 mr-1" /> {c.status === 'ended' ? 'Reativar' : 'Ativar'}
                          </Button>
                        )}
                        {c.status !== 'ended' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10 flex-1"
                            onClick={() => updateCampaignStatus.mutate({ id: c.id, status: 'ended' })}
                            disabled={updateCampaignStatus.isPending}>
                            Encerrar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PRODUTOS PATROCINADOS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Produtos com <code className="bg-muted px-1 rounded">is_promoted=true</code> ou desconto ativo. Edite via <strong>Adicionar Produto</strong> na loja.</p>
          {loadingProducts ? (
            <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : promotedProducts.length === 0 ? (
            <EmptyState icon={Tag} title="Nenhum produto promovido" sub="Produtos com desconto ou is_promoted=true aparecem aqui" />
          ) : (
            promotedProducts.map(p => (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">{p.plant_name}</p>
                      {p.is_promoted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> Patrocinado
                        </span>
                      )}
                      {p.badge_text && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                          {p.badge_text}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.stores?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-semibold text-primary">R$ {Number(p.price).toFixed(2)}</p>
                      {p.original_price && (
                        <p className="text-xs text-muted-foreground line-through">R$ {Number(p.original_price).toFixed(2)}</p>
                      )}
                      {p.discount_percent && (
                        <span className="text-xs text-emerald-400 font-bold">-{p.discount_percent}%</span>
                      )}
                      {p.ad_priority > 0 && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" /> P{p.ad_priority}
                        </span>
                      )}
                    </div>
                    {p.promo_ends_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Expira: {new Date(p.promo_ends_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => removePromotion.mutate(p.id)}
                    disabled={removePromotion.isPending}
                    title="Remover promoção">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ANALYTICS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Overview cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Total Impressões',    value: totalImpressions.toLocaleString('pt-BR'), icon: Eye,              color: 'blue'   },
              { label: 'Total Cliques',        value: totalClicks.toLocaleString('pt-BR'),      icon: MousePointerClick, color: 'emerald' },
              { label: 'CTR Médio',            value: totalCTR + '%',                           icon: TrendingUp,        color: 'violet'  },
              { label: 'Budget Disponível',    value: 'R$' + (totalBudget - totalSpent).toFixed(0), icon: DollarSign, color: 'amber'   },
              { label: 'Budget Total',         value: 'R$' + totalBudget.toFixed(0),            icon: Layers,           color: 'gray'    },
              { label: 'Campanhas Ativas',     value: String(activeCampaigns),                  icon: Megaphone,        color: 'emerald' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5 min-h-[60px]">
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                  <p className="text-base font-bold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top campanhas por performance */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Campanhas por Performance</p>
            {campaigns.length === 0 ? (
              <EmptyState icon={BarChart3} title="Sem dados ainda" sub="Crie campanhas para ver métricas aqui" />
            ) : (
              [...campaigns]
                .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
                .slice(0, 10)
                .map(c => {
                  const pct = Number(c.budget_total) > 0 ? Math.min((Number(c.budget_spent) / Number(c.budget_total)) * 100, 100) : 0;
                  return (
                    <div key={c.id} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.stores?.name} · {formatLabel(c.ad_format ?? 'product_card')}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor(c.status)}`}>
                          {{ active: '●', paused: '⏸', ended: '■', pending: '○' }[c.status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground mb-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">{(c.impressions ?? 0).toLocaleString('pt-BR')}</p>
                          <p>Imp.</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{(c.clicks ?? 0).toLocaleString('pt-BR')}</p>
                          <p>Cliques</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{ctr(c.clicks ?? 0, c.impressions ?? 0)}</p>
                          <p>CTR</p>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-destructive' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% do budget utilizado</p>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Helpers de Layout ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{title}</p>
      <p className="text-xs mt-1 opacity-60">{sub}</p>
    </div>
  );
}
