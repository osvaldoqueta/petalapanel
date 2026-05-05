/**
 * useStoreContext — Hook que identifica a loja do Seller logado.
 * Super User / Support: retorna null (sem filtro = vê tudo).
 * Seller: retorna o store_id da loja onde owner_id = auth.uid().
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface StoreContext {
  storeId: string | null
  storeName: string | null
  isOwner: boolean
  isLoading: boolean
}

export function useStoreContext(): StoreContext {
  const { session, role } = useAuth()
  const isAdmin = role?.toLowerCase() === 'super user' ||
    role?.toLowerCase() === 'regional manager' ||
    role?.toLowerCase() === 'support'

  const { data, isLoading } = useQuery({
    queryKey: ['store-context', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || isAdmin) return null

      const { data: store, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .limit(1)
        .single()

      if (error || !store) return null
      return { id: store.id as string, name: store.name as string }
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000,
  })

  return {
    storeId: data?.id ?? null,
    storeName: data?.name ?? null,
    isOwner: !!data?.id,
    isLoading,
  }
}
