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
  status: 'pending' | 'preparing' | 'searching_courier' | 'shipped' | 'delivered' | 'cancelled'
  payment_status?: 'pending' | 'paid' | 'refunded' | 'failed'
  payout_released?: boolean
  total_amount: number
  delivery_fee: number
  platform_fee?: number
  created_at: string
  updated_at: string
  items?: OrderItem[]
  // Joined fields
  buyer_name?: string
  buyer_email?: string
  buyer_avatar?: string | null
  store_name?: string
}

export interface OrderMessage {
  id: string
  order_id: string
  sender_id: string
  sender_name: string | null
  sender_role: 'buyer' | 'seller' | 'support' | 'system'
  message: string
  created_at: string
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
  entity?: string
  store_id?: string
  created_at?: string
}

export interface ProductQuestion {
  id: string
  inventory_id: string
  store_id: string
  asker_id: string | null
  asker_name: string | null
  question: string
  answer: string | null
  answered_at: string | null
  answerer_name: string | null
  votes: number
  is_verified_buyer: boolean
  created_at: string
  // Joined fields
  product_name?: string
  product_image?: string | null
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

// ─── SuperAdmin Types ────────────────────────────────────────────────────────

export interface AdminUser {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role_id: string | null
  role_name: string | null
  created_at: string
  updated_at: string
}

export interface RoleOption {
  id: string
  name: string
}

export interface ModerationItem {
  id: string
  name: string
  video_url: string
  image_url: string | null
  video_moderation_status: string
  video_moderation_reason: string | null
  price: number
  store_id: string
  store_name: string
  store_owner_id: string
  created_at: string
}

export interface SalesSettings {
  id: number
  store_fee_percentage: number
  courier_fee_percentage: number
  lojista_terms_url: string | null
  courier_terms_url: string | null
  discount_active: boolean
  discount_percentage: number
  updated_at: string
}

export interface FinancialMetrics {
  gtv: number
  platformRevenue: number
  orderCount: number
  avgTicket: number
  gtvChange: number
  revenueChange: number
  countChange: number
  ticketChange: number
}

// ─── Merchant Reports ───────────────────────────────────────────────────────

export interface ReportSchedule {
  id: string
  store_id: string
  days_of_week: string[]
  time_of_day: string
  is_active: boolean
  created_at: string
  updated_at: string
}

