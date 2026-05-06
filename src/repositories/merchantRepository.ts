import { supabase } from '@/integrations/supabase/client'
import type { StoreInventory, AdCampaign, ProductQuestion } from '@/shared/types'

export const merchantRepository = {
  // ─── KPIs ────────────────────────────────────────────────────────────────
  getKPIs: async (storeId: string | null) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    let ordersQuery = supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (storeId) ordersQuery = ordersQuery.eq('store_id', storeId)
    const { data: orders } = await ordersQuery

    const revenue = (orders || []).reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
    const orderCount = orders?.length || 0
    const aov = orderCount > 0 ? revenue / orderCount : 0

    let videoQuery = supabase
      .from('store_inventory')
      .select('video_views')
      .not('video_url', 'is', null)

    if (storeId) videoQuery = videoQuery.eq('store_id', storeId)
    const { data: videos } = await videoQuery

    const totalViews = (videos || []).reduce((s, v) => s + (Number(v.video_views) || 0), 0)

    return { revenue, orderCount, aov, totalViews }
  },

  // ─── Inventory ───────────────────────────────────────────────────────────
  getInventory: async (storeId: string | null) => {
    let query = supabase
      .from('store_inventory')
      .select('*')
      .order('created_at', { ascending: false })

    if (storeId) query = query.eq('store_id', storeId)
    const { data, error } = await query
    
    if (error) throw error
    return data as StoreInventory[]
  },

  upsertProduct: async (
    storeId: string, 
    productId: string | null, 
    productData: {
      name: string
      plant_species: string
      price: number
      weight_kg: number
      stock_qty?: number
      image_url: string
      video_url: string
      ai_description?: string
      is_active?: boolean
      original_price?: number | null
      discount_percent?: number | null
      is_flash_sale?: boolean
      flash_sale_ends_at?: string | null
      category?: string | null
      subcategory?: string | null
    }
  ) => {
    const payload: any = {
      store_id: storeId,
      name: productData.name,
      plant_species: productData.plant_species,
      price: productData.price,
      weight_kg: productData.weight_kg,
      stock_qty: productData.stock_qty || 0,
      image_url: productData.image_url,
      video_url: productData.video_url || null,
      ai_description: productData.ai_description || null,
      is_active: productData.is_active ?? true,
      original_price: productData.original_price || null,
      discount_percent: productData.discount_percent || null,
      is_flash_sale: productData.is_flash_sale ?? false,
      flash_sale_ends_at: productData.flash_sale_ends_at || null,
      category: productData.category || null,
      subcategory: productData.subcategory || null,
    }

    // If there's a video, and we are updating or creating, set to pending if changed.
    // We will do this explicitly if the UI forces it, but Supabase might have triggers.
    // For now, if a video_url is provided, we force video_moderation_status to pending.
    if (productData.video_url) {
      payload.video_moderation_status = 'pending'
      payload.video_moderation_reason = null
    }

    let query
    if (productId) {
      query = supabase.from('store_inventory').update(payload).eq('id', productId)
    } else {
      query = supabase.from('store_inventory').insert(payload)
    }

    const { data, error } = await query.select().single()
    if (error) throw error
    return data as StoreInventory
  },

  quickUpdateProduct: async (
    storeId: string,
    productId: string,
    updates: { price?: number; stock_qty?: number }
  ) => {
    const { data, error } = await supabase
      .from('store_inventory')
      .update(updates)
      .match({ id: productId, store_id: storeId })
      .select()
      .single()

    if (error) throw error
    return data as StoreInventory
  },

  bulkUpdateStatus: async (storeId: string, productIds: string[], is_active: boolean) => {
    const { error } = await supabase
      .from('store_inventory')
      .update({ is_active })
      .eq('store_id', storeId)
      .in('id', productIds)

    if (error) throw error
  },

  bulkDeleteProducts: async (storeId: string, productIds: string[]) => {
    const { error } = await supabase
      .from('store_inventory')
      .delete()
      .eq('store_id', storeId)
      .in('id', productIds)

    if (error) throw error
  },

  // ─── Campaigns ───────────────────────────────────────────────────────────
  getCampaigns: async (storeId: string | null) => {
    let query = supabase
      .from('ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (storeId) query = query.eq('store_id', storeId)
    const { data, error } = await query
    
    if (error) throw error
    // Casting manually as types may vary based on sprint
    return data as any[]
  },

  createCampaign: async (storeId: string, campaignData: { name: string, budget: number, cpc: number }) => {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert({
        store_id: storeId,
        name: campaignData.name,
        budget_total: campaignData.budget,
        cpc: campaignData.cpc,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  linkProductsToCampaign: async (storeId: string, campaignId: string, productIds: string[]) => {
    if (productIds.length === 0) return

    const { error } = await supabase
      .from('store_inventory')
      .update({
        is_promoted: true,
        ad_priority: 100,
        ad_campaign_id: campaignId
      })
      .in('id', productIds)
      .eq('store_id', storeId) // Security boundary

    if (error) throw error
  },

  // ─── Moderation ──────────────────────────────────────────────────────────
  getModerationItems: async (storeId: string | null) => {
    let query = supabase
      .from('store_inventory')
      .select('id, name, video_url, image_url, video_moderation_status, video_moderation_reason, created_at, stores!inner(store_name)')
      .not('video_url', 'is', null)
      .in('video_moderation_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (storeId) query = query.eq('store_id', storeId)
    const { data, error } = await query
    
    if (error) throw error
    return (data || []).map((i: any) => ({
      id: String(i.id),
      name: String(i.name),
      video_url: String(i.video_url),
      image_url: i.image_url,
      video_moderation_status: i.video_moderation_status,
      video_moderation_reason: i.video_moderation_reason,
      store_name: i.stores?.store_name || 'Loja',
      created_at: String(i.created_at),
    }))
  },

  // ─── Q&A Support ──────────────────────────────────────────────────────────
  getQuestions: async (storeId: string | null, filter: 'all' | 'pending' | 'answered' = 'all') => {
    let query = supabase
      .from('product_questions')
      .select(`
        id,
        inventory_id,
        store_id,
        asker_id,
        asker_name,
        question,
        answer,
        answered_at,
        answerer_name,
        votes,
        is_verified_buyer,
        created_at,
        store_inventory(name, image_url)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (storeId) query = query.eq('store_id', storeId)

    if (filter === 'pending') {
      query = query.is('answer', null)
    } else if (filter === 'answered') {
      query = query.not('answer', 'is', null)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => ({
      ...row,
      product_name: row.store_inventory?.name || 'Produto',
      product_image: row.store_inventory?.image_url || null,
    })) as ProductQuestion[]
  },

  answerQuestion: async (
    storeId: string,
    questionId: string,
    answer: string,
    answererName: string
  ) => {
    const { error } = await supabase
      .from('product_questions')
      .update({
        answer,
        answered_at: new Date().toISOString(),
        answerer_name: answererName,
      })
      .eq('id', questionId)
      .eq('store_id', storeId) // Security constraint

    if (error) throw error
  },

  // ─── Merchant Reports ───────────────────────────────────────────────────────
  getReportSchedule: async (storeId: string) => {
    const { data, error } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  upsertReportSchedule: async (
    storeId: string,
    schedule: { days_of_week: string[]; time_of_day: string; is_active: boolean }
  ) => {
    const { data, error } = await supabase
      .from('report_schedules')
      .upsert(
        {
          store_id: storeId,
          days_of_week: schedule.days_of_week,
          time_of_day: schedule.time_of_day,
          is_active: schedule.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  getOrdersForReport: async (storeId: string, date: string) => {
    // Busca orders do dia específico (yyyy-mm-dd)
    const startOfDay = new Date(`${date}T00:00:00.000Z`).toISOString()
    const endOfDay = new Date(`${date}T23:59:59.999Z`).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, platform_fee, created_at, status')
      .eq('store_id', storeId)
      .eq('payment_status', 'paid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  getUnansweredCount: async (storeId: string | null) => {
    let query = supabase
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .is('answer', null)

    if (storeId) query = query.eq('store_id', storeId)

    const { count, error } = await query
    if (error) throw error
    return count || 0
  },

  // ─── Actions ───────────────────────────────────────────────────────────
  deleteProduct: async (storeId: string, productId: string) => {
    // Np1 security boundary: ensure storeId matches
    const { error } = await supabase
      .from('store_inventory')
      .delete()
      .match({ id: productId, store_id: storeId })
    
    if (error) throw error
    return true
  }
}
