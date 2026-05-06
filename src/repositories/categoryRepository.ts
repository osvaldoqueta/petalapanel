/**
 * categoryRepository — Repositório dedicado para categorias dinâmicas.
 *
 * Desacoplado do merchantRepository (Np1.md).
 * Inclui hooks TanStack Query com staleTime de 1 hora,
 * pois categorias mudam raramente.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface AppCategory {
  id: string
  label: string
  slug?: string
  icon_url?: string | null
  created_at?: string
}

export interface AppSubcategory {
  id: string
  category_id: string
  label: string
  slug?: string
  created_at?: string
}

const STALE_TIME = 60 * 60 * 1000 // 1 hora

// ─── Raw fetch functions ─────────────────────────────────────────────────────

export const categoryRepository = {
  getCategories: async (): Promise<AppCategory[]> => {
    const { data, error } = await supabase
      .from('app_categories')
      .select('*')
      .order('label', { ascending: true })

    if (error) throw error
    return data as AppCategory[]
  },

  getSubcategories: async (categoryId: string): Promise<AppSubcategory[]> => {
    if (!categoryId) return []
    const { data, error } = await supabase
      .from('app_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('label', { ascending: true })

    if (error) throw error
    return data as AppSubcategory[]
  },
}

// ─── TanStack Query Hooks ────────────────────────────────────────────────────

export function useCategories(enabled = true) {
  return useQuery<AppCategory[]>({
    queryKey: ['categories'],
    queryFn: categoryRepository.getCategories,
    staleTime: STALE_TIME,
    gcTime: 2 * STALE_TIME,
    enabled,
  })
}

export function useSubcategories(categoryId: string, enabled = true) {
  return useQuery<AppSubcategory[]>({
    queryKey: ['subcategories', categoryId],
    queryFn: () => categoryRepository.getSubcategories(categoryId),
    staleTime: STALE_TIME,
    gcTime: 2 * STALE_TIME,
    enabled: !!categoryId && enabled,
  })
}
