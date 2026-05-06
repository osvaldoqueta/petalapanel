// ─── Shared Types (synced from petalapp) ─────────────────────────────────────
// Keep these in parity with petalapp/src/types/ when the schema changes.

export type UserRole = 'Super User' | 'Regional Manager' | 'Support' | 'Seller'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole | null
  email?: string
  created_at: string
  updated_at: string
}

export interface AppConfigRow {
  id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  store_id: string
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  total_amount: number
  delivery_fee: number
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export interface StoreInventory {
  id: string
  store_id: string
  name: string
  plant_species?: string
  price: number
  weight_kg?: number
  stock_qty?: number
  original_price: number | null
  discount_percent: number | null
  image_url: string | null
  video_url: string | null
  ai_description?: string | null
  video_moderation_status: 'pending' | 'approved' | 'rejected' | null
  video_moderation_reason: string | null
  is_active: boolean
  is_promoted?: boolean
  is_flash_sale: boolean
  flash_sale_ends_at: string | null
  category: string | null
  subcategory: string | null
  video_views: number
  video_likes: number
  video_shares: number
  video_clicks: number
  created_at: string
}

export interface AdCampaign {
  id: string
  store_id: string
  title?: string
  name?: string
  image_url: string | null
  target_url: string | null
  start_date?: string
  starts_at?: string
  end_date?: string
  ends_at?: string
  is_active?: boolean
  status?: string
  budget_total?: number
  budget_spent?: number
  cpc?: number
  impressions?: number
  clicks?: number
  created_at: string
}

export interface VideoModerationLog {
  id: string
  product_id: string
  video_url: string
  ai_verdict: Record<string, unknown>
  moderation_status: string
  created_at: string
}

export interface AuditLog {
  id?: string
  user_id: string
  action: string
  table_name: string
  record_key: string
  old_value: string | null
  new_value: string | null
  created_at?: string
}

export interface TopVideo {
  id: string
  name: string
  price: number
  original_price: number | null
  discount_percent: number | null
  image_url: string | null
  video_url: string
  video_views: number
  video_likes: number
  video_shares: number
  video_clicks: number
  store_name: string
  store_logo: string | null
  engagement_score: number
}

export interface AppTheme {
  id: string
  season_name: string
  primary_color: string
  secondary_color: string
  accent_color: string
  button_radius: string
  icon_url: string | null
  icon_set_url: string | null
  is_active_override: boolean
}

export type BiPeriod = 'today' | '7d' | '30d' | 'custom'

export interface BiFilterState {
  period: BiPeriod
  startDate: string | null
  endDate: string | null
  category: string | null
  region: string | null
}

