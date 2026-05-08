import { supabaseAdmin } from '@/integrations/supabase/admin';

export interface AffiliateProduct {
  id: string;
  speciesKey: string;
  name: string;
  description: string;
  imageEmoji: string;
  affiliateUrl: string;
  tag: string | null;
  sortOrder: number;
  isActive: boolean;
}

let cachedProducts: AffiliateProduct[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const affiliateRepository = {
  /**
   * Get products matching species name and/or AI-generated keywords,
   * grouped by specific treatments vs general maintenance.
   * Utilizes in-memory caching to prevent DB spam.
   */
  async getProductsBySpeciesAndKeywords(
    species: string,
    keywords: string[] = []
  ): Promise<{ specific: AffiliateProduct[], general: AffiliateProduct[] }> {
    // In-memory cache logic
    if (!cachedProducts || Date.now() - cacheTimestamp > CACHE_TTL_MS) {
      const { data, error } = await supabaseAdmin
        .from('affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        cachedProducts = data.map(mapRow);
        cacheTimestamp = Date.now();
      }
    }

    const products = cachedProducts || [];
    const lower = species.toLowerCase();
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    // Score each product by relevance
    const scored = products
      .filter(p => p.speciesKey !== '_default')
      .map(p => {
        let score = 0;
        const key = p.speciesKey.toLowerCase();
        // Exact species match
        if (lower.includes(key) || key.includes(lower)) score += 10;
        // Keyword match
        for (const kw of lowerKeywords) {
          if (key.includes(kw) || kw.includes(key)) score += 5;
        }
        return { product: p, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.product);

    // General/Maintenance products
    const general = products.filter(p => p.speciesKey === '_default');

    if (scored.length > 0) {
      return { specific: scored, general };
    }

    // Fallback: species substring match
    const matched = products.filter(
      p => p.speciesKey !== '_default' && lower.includes(p.speciesKey)
    );

    return {
      specific: matched,
      general
    };
  },

  async getProductsBySpecies(species: string): Promise<{ specific: AffiliateProduct[], general: AffiliateProduct[] }> {
    return this.getProductsBySpeciesAndKeywords(species);
  },

  async getAllProducts(
    page = 1,
    pageSize = 20
  ): Promise<{ products: AffiliateProduct[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { count } = await supabaseAdmin
      .from('affiliate_products')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabaseAdmin
      .from('affiliate_products')
      .select('*')
      .order('species_key')
      .order('sort_order', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      products: (data ?? []).map(mapRow),
      total: count ?? 0,
    };
  },

  async getDistinctSpeciesKeys(): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('affiliate_products')
      .select('species_key');
    const keys = [...new Set((data ?? []).map((r: any) => r.species_key))];
    return keys.sort();
  },

  async upsertProduct(product: Omit<AffiliateProduct, 'id'> & { id?: string }): Promise<void> {
    const row: any = {
      species_key: product.speciesKey,
      name: product.name,
      description: product.description,
      image_emoji: product.imageEmoji,
      affiliate_url: product.affiliateUrl,
      tag: product.tag || null,
      sort_order: product.sortOrder,
      is_active: product.isActive,
    };
    if (product.id) row.id = product.id;

    const { error } = await supabaseAdmin
      .from('affiliate_products')
      .upsert(row, { onConflict: 'id' });

    if (error) throw error;

    // Invalidate cache
    cachedProducts = null;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('affiliate_products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate cache
    cachedProducts = null;
  },
};

function mapRow(row: any): AffiliateProduct {
  return {
    id: row.id,
    speciesKey: row.species_key,
    name: row.name,
    description: row.description,
    imageEmoji: row.image_emoji,
    affiliateUrl: row.affiliate_url,
    tag: row.tag,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}
