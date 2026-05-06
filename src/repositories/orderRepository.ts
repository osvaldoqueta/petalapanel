/**
 * orderRepository — Repositório dedicado para operações de pedidos.
 * Isolamento multi-tenant: queries de lojista exigem storeId.
 * Queries de auditoria (SuperAdmin) usam supabaseAdmin para bypass de RLS.
 */
import { supabase } from '@/integrations/supabase/client'
import { supabaseAdmin } from '@/integrations/supabase/admin'
import type { Order, OrderMessage } from '@/shared/types'

export const orderRepository = {
  getOrders: async (storeId: string | null): Promise<Order[]> => {
    let query = supabase
      .from('orders')
      .select(`
        id, user_id, store_id, status, payment_status, payout_released,
        total_amount, delivery_fee, platform_fee, created_at, updated_at,
        profiles!orders_user_id_fkey(full_name, email, avatar_url),
        order_items(id, order_id, product_id, product_name, quantity, unit_price)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (storeId) query = query.eq('store_id', storeId)
    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id, user_id: row.user_id, store_id: row.store_id,
      status: row.status, payment_status: row.payment_status,
      payout_released: row.payout_released ?? false,
      total_amount: Number(row.total_amount) || 0,
      delivery_fee: Number(row.delivery_fee) || 0,
      platform_fee: Number(row.platform_fee) || 0,
      created_at: row.created_at, updated_at: row.updated_at,
      items: row.order_items || [],
      buyer_name: row.profiles?.full_name || 'Cliente',
      buyer_email: row.profiles?.email || '',
      buyer_avatar: row.profiles?.avatar_url || null,
    })) as Order[]
  },

  updateOrderStatus: async (storeId: string, orderId: string, status: Order['status']): Promise<void> => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('store_id', storeId)
    if (error) throw error
  },

  getOrderMessages: async (orderId: string): Promise<OrderMessage[]> => {
    const { data, error } = await supabaseAdmin
      .from('order_messages')
      .select('id, order_id, sender_id, sender_name, sender_role, message, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as OrderMessage[]
  },

  getAuditOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, user_id, store_id, status, payment_status, payout_released,
        total_amount, delivery_fee, platform_fee, created_at, updated_at,
        stores(name)
      `)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id, user_id: row.user_id, store_id: row.store_id,
      status: row.status, payment_status: row.payment_status,
      payout_released: row.payout_released ?? false,
      total_amount: Number(row.total_amount) || 0,
      delivery_fee: Number(row.delivery_fee) || 0,
      platform_fee: Number(row.platform_fee) || 0,
      created_at: row.created_at, updated_at: row.updated_at,
      store_name: row.stores?.name || 'Loja',
    })) as Order[]
  },

  forceReleasePayout: async (orderId: string): Promise<boolean> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const response = await fetch(`${supabaseUrl}/functions/v1/release-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      throw new Error(err.message || `Erro HTTP ${response.status}`)
    }
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ payout_released: true })
      .eq('id', orderId)
    if (error) throw error
    return true
  },

  getStoreInfo: async (storeId: string) => {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, address, city, state, zip_code, phone, cnpj')
      .eq('id', storeId)
      .single()
    if (error) throw error
    return data
  },
}
