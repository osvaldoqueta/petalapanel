/**
 * adminRepository — Repositório para operações SuperAdmin.
 *
 * Usa supabaseAdmin (Service Role) para bypass de RLS em operações
 * administrativas: gestão de usuários, moderação global, configurações.
 */
import { supabaseAdmin } from '@/integrations/supabase/admin'
import type { AdminUser, RoleOption, ModerationItem, SalesSettings } from '@/shared/types'

export const adminRepository = {
  // ─── User Management ─────────────────────────────────────────────────────
  getUsers: async (): Promise<AdminUser[]> => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id,
        full_name,
        avatar_url,
        email,
        role_id,
        roles(name),
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      email: row.email,
      role_id: row.role_id,
      role_name: Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as AdminUser[]
  },

  getRoles: async (): Promise<RoleOption[]> => {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .order('name')

    if (error) throw error
    return (data || []) as RoleOption[]
  },

  updateUserRole: async (userId: string, roleId: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role_id: roleId })
      .eq('user_id', userId)

    if (error) throw error
  },

  // ─── Global Moderation ────────────────────────────────────────────────────
  getModerationQueue: async (): Promise<ModerationItem[]> => {
    const { data, error } = await supabaseAdmin
      .from('store_inventory')
      .select(`
        id,
        name,
        video_url,
        image_url,
        video_moderation_status,
        video_moderation_reason,
        price,
        store_id,
        created_at,
        stores(name, owner_id)
      `)
      .not('video_url', 'is', null)
      .in('video_moderation_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return (data || []).map((row: any) => ({
      ...row,
      store_name: row.stores?.name || 'Loja',
      store_owner_id: row.stores?.owner_id || '',
    })) as ModerationItem[]
  },

  approveVideo: async (productId: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('store_inventory')
      .update({
        video_moderation_status: 'approved',
        video_moderation_reason: null,
      })
      .eq('id', productId)

    if (error) throw error
  },

  rejectVideo: async (productId: string, reason: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('store_inventory')
      .update({
        video_moderation_status: 'rejected',
        video_moderation_reason: reason,
      })
      .eq('id', productId)

    if (error) throw error
  },

  sendNotification: async (
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    actionUrl?: string
  ): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('system_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl || null,
        dedup_key: `moderation_${Date.now()}`,
      })

    if (error) throw error
  },

  // ─── Sales Settings ───────────────────────────────────────────────────────
  getSalesSettings: async (): Promise<SalesSettings | null> => {
    const { data, error } = await supabaseAdmin
      .from('sales_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) throw error
    return data as SalesSettings
  },

  updateSalesSettings: async (
    settings: Partial<Pick<SalesSettings, 'store_fee_percentage' | 'courier_fee_percentage' | 'discount_active' | 'discount_percentage'>>
  ): Promise<void> => {
    const { error } = await supabaseAdmin
      .from('sales_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) throw error
  },

  // ─── Financial BI ─────────────────────────────────────────────────────────
  getFinancialOrders: async (startDate: string, endDate: string) => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, platform_fee, payment_status, status, created_at, stores(name)')
      .eq('payment_status', 'paid')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // ─── Broadcast ──────────────────────────────────────────────────────────────
  createBroadcast: async (payload: {
    title: string
    body: string
    target_audience: string
    action_url?: string
    channel?: string
  }) => {
    const { data, error } = await supabaseAdmin
      .from('admin_broadcasts')
      .insert({
        title: payload.title,
        body: payload.body,
        target_audience: payload.target_audience,
        action_url: payload.action_url || null,
        channel: payload.channel || 'in_app',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  getEstimatedReach: async (audience: string): Promise<number> => {
    if (audience === 'all') {
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      return count || 0
    }

    // Filter by role name
    const roleName = audience === 'sellers' ? 'Seller' : 'Courier'
    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (!role) return 0

    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', role.id)

    if (error) throw error
    return count || 0
  },

  // ─── Performance / CWV ──────────────────────────────────────────────────────
  getPerformanceLogs: async (days: number = 7) => {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabaseAdmin
      .from('app_logs')
      .select('*')
      .eq('source', 'cwv')
      .eq('level', 'metric')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(2000)

    if (error) throw error
    return data || []
  },
}
