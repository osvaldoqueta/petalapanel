import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface Store {
  id: string
  name: string
}

interface StoreContextType {
  stores: Store[]
  storeId: string | null
  storeName: string | null
  isOwner: boolean
  isLoading: boolean
  setActiveStore: (id: string) => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, role } = useAuth()
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  const isAdmin = role?.toLowerCase() === 'super user' ||
    role?.toLowerCase() === 'regional manager' ||
    role?.toLowerCase() === 'support'

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['merchant-stores', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || isAdmin) return []

      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Store[]
    },
    enabled: !!session?.user?.id && !isAdmin,
    staleTime: 10 * 60 * 1000,
  })

  // Set the default active store to the first one when loaded
  useEffect(() => {
    if (stores.length > 0 && !activeStoreId) {
      setActiveStoreId(stores[0].id)
    }
  }, [stores, activeStoreId])

  const activeStore = stores.find(s => s.id === activeStoreId) || stores[0]

  const value: StoreContextType = {
    stores,
    storeId: activeStore?.id ?? null,
    storeName: activeStore?.name ?? null,
    isOwner: !!activeStore?.id,
    isLoading,
    setActiveStore: setActiveStoreId,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStoreContext() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStoreContext must be used within a StoreProvider')
  }
  return context
}
