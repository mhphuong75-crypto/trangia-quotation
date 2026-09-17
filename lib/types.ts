export type CustomerType = 
  | 'Nội thất nhà dân'
  | 'Nội thất Văn phòng'
  | 'Nội thất khách sạn'
  | 'Dự án'
  | 'Nội thất cửa hàng'
  | 'Nội thất trường học'
  | 'Nội thất Spa'

export type SiteReadiness = 'ready' | 'unclear' | 'not_ready'
export type MeasurementQuality = 'actual' | 'drawing' | 'none'
export type RiskLevel = 'GREEN' | 'AMBER' | 'RED'

export interface QuotationInput {
  product_type: string
  total_m2: number
  num_rooms?: number
  customer_type: CustomerType
  location_province: string
  location_km: number
  site_readiness: SiteReadiness
  measurement_quality: MeasurementQuality
  timeline_months: number
  tu_pct: number
  nvl_pct: number
  nvl_buffer_level: 'low' | 'medium' | 'high'
  contract_value: number  // sau VAT
  created_by: string
}

export interface CostBreakdown {
  nvl_base: number
  nvl_buffer: number
  nvl_total: number
  nvl_pct_of_dt: number
  nc_xuong: number
  nc_xuong_pct: number
  nc_lapdat: number
  nc_lapdat_pct: number
  di_lai_an_o: number
  van_chuyen: number
  capital_cost: CapitalCost
  cp_chung: number
  total: number
}

export interface CapitalCost {
  bltu_fee: number
  blthhd_fee: number
  nvl_deposit_total: number
  interest_cost: number
  collateral_cost: number
  total: number
}

export interface MarginScenario {
  low: number
  mid: number
  high: number
}

export interface QuotationResult {
  id: string
  input: QuotationInput
  cost_breakdown: CostBreakdown
  dt_before_vat: number
  margin: MarginScenario
  risk_level: RiskLevel
  ai_narrative: string
  trigger_questions: string[]
  similar_orders: SimilarOrder[]
  created_at: string
  approved_by?: string
  approved_at?: string
}

export interface SimilarOrder {
  ma: string
  ten: string
  dt: number
  nvl_pct: number
  nc_lapdat_pct: number
  margin_sau: number
  loai: 'LAI' | 'LO'
  loai_kh: string
}

export interface HistoricalOrder {
  ma: string
  ten: string
  tinh_trang: string
  dt: number
  nvl: number
  nvl_pct: number
  nc_xuong: number
  nc_xuong_pct: number
  nc_lapdat: number
  nc_lapdat_pct: number
  total_nc_pct: number
  van_chuyen: number
  tc_baolanh: number
  cp_vh: number
  ban_hang: number
  ln_truoc: number
  ln_sau: number
  margin_truoc: number
  margin_sau: number
  loai: 'LAI' | 'LO'
  loai_kh: string
  loai_sp: string
  dia_diem: string
  ngay_ky?: string
  ngay_xong?: string
}
