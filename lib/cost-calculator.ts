import { QuotationInput, CostBreakdown, CapitalCost, MarginScenario } from './types'

// Risk factors từ data 56 orders thực tế Trần Gia
export const RISK_FACTORS = {
  // NVL thresholds
  nvl_alert_amber: 0.45,  // >45% → AMBER
  nvl_alert_red: 0.55,    // >55% → RED
  nvl_avg_loss: 0.58,     // avg ở orders lỗ
  nvl_avg_profit: 0.34,   // avg ở orders lãi
  
  // NC lắp đặt thresholds
  nc_lapdat_amber: 0.14,  // >14% → AMBER
  nc_lapdat_red: 0.18,    // >18% → RED
  nc_lapdat_avg_loss: 0.197,
  nc_lapdat_avg_profit: 0.091,
  
  // NC xưởng thresholds
  nc_xuong_amber: 0.18,
  nc_xuong_avg_loss: 0.224,
  nc_xuong_avg_profit: 0.131,
  
  // Margin thresholds (đã cập nhật từ data)
  margin_green: 0.20,     // >20%
  margin_amber_low: 0.10, // 10-20%
  // <10% = RED
}

// Capital cost params (từ file ANh_Phuong)
export const CAPITAL_PARAMS = {
  interest_rate_bidv: 0.094,    // 9.4%/năm
  interest_rate_vpbank: 0.143,  // 14.3%/năm
  interest_rate_avg: 0.1185,    // bình quân
  bl_fee_rate: 0.02,            // 2%/năm
  blthhd_pct: 0.05,             // 5% HĐ
  blthhd_bank_fee: 0.015,       // 1.5%/năm
  nvl_deposit_rate: 0.18,       // 18% NVL mỗi lần
  asset_collateral: 5000,       // 5 tỷ đóng băng (triệu VND)
}

// NC adjustment by customer type (từ lịch sử)
export const NC_MULTIPLIERS: Record<string, number> = {
  'Nội thất nhà dân': 1.0,
  'Nội thất Văn phòng': 1.1,
  'Nội thất khách sạn': 1.3,  // phức tạp hơn
  'Dự án': 1.2,
  'Nội thất cửa hàng': 0.9,
  'Nội thất trường học': 1.0,
  'Nội thất Spa': 1.1,
}

// Distance-based cost (triệu VND/tháng cho 15 thợ)
export function calcDistanceCost(km: number, months: number): { di_lai: number; van_chuyen: number } {
  // 15 thợ × ăn ở + đi lại
  const workers = 15
  const food_per_person_month = 0.13 * 26  // 130K/ngày × 26 ngày
  const accommodation_per_person = 2.5     // 2.5 triệu/tháng
  const transport_home = 8                 // xe về cuối tuần
  const allowance = 1.0                   // phụ cấp xa nhà
  
  let monthly_labor = 0
  let monthly_transport = 0
  
  if (km > 30) {
    monthly_labor = workers * (food_per_person_month + accommodation_per_person + allowance) + transport_home
    monthly_transport = 11 * 6 + 15  // 11 chuyến xe tải × 6tr + bốc xếp
  } else if (km > 10) {
    monthly_labor = workers * food_per_person_month * 0.5
    monthly_transport = 6 * 6 + 10
  } else {
    monthly_labor = 0
    monthly_transport = 4 * 4
  }
  
  return {
    di_lai: monthly_labor * months,
    van_chuyen: monthly_transport * months
  }
}

// NVL buffer by timeline
export function getNvlBuffer(timeline_months: number, level: 'low' | 'medium' | 'high'): number {
  if (level === 'low' || timeline_months < 3) return 0.02      // 2%
  if (level === 'medium' || timeline_months <= 6) return 0.05   // 5%
  return 0.08  // 8% cho đơn >6 tháng
}

export function calculateCapitalCost(input: QuotationInput): CapitalCost {
  const dt_ex_vat = input.contract_value / 1.1  // DT trước VAT
  const dt_incl_vat = input.contract_value       // sau VAT
  
  // TU
  const tu_total = dt_incl_vat * input.tu_pct
  
  // Phí BLTU
  const bltu_fee = tu_total * CAPITAL_PARAMS.bl_fee_rate
  
  // Phí BLTHHĐ
  const blthhd_value = dt_incl_vat * CAPITAL_PARAMS.blthhd_pct
  const blthhd_fee = blthhd_value * CAPITAL_PARAMS.blthhd_bank_fee
  
  // Deposit NVL (3 lần)
  const nvl_total = dt_ex_vat * input.nvl_pct
  const nvl_deposit_each = nvl_total * CAPITAL_PARAMS.nvl_deposit_rate
  const nvl_deposit_total = nvl_deposit_each * 3
  
  // Lãi vay tự ứng
  const capital_gap = Math.max(0, nvl_deposit_total - tu_total)
  const interest_cost = capital_gap * CAPITAL_PARAMS.interest_rate_avg * (input.timeline_months / 12)
  
  // Chi phí đóng băng tài sản
  const collateral_cost = CAPITAL_PARAMS.asset_collateral * CAPITAL_PARAMS.interest_rate_bidv * (input.timeline_months / 12)
  
  const total = bltu_fee + blthhd_fee + interest_cost + collateral_cost
  
  return {
    bltu_fee,
    blthhd_fee,
    nvl_deposit_total,
    interest_cost,
    collateral_cost,
    total
  }
}

export function calculateCosts(input: QuotationInput): CostBreakdown {
  const dt_ex_vat = input.contract_value / 1.1
  
  // NVL
  const nvl_buffer = getNvlBuffer(input.timeline_months, input.nvl_buffer_level)
  const nvl_base = dt_ex_vat * input.nvl_pct
  const nvl_buffer_amt = dt_ex_vat * nvl_buffer
  const nvl_total = nvl_base + nvl_buffer_amt
  const nvl_pct_of_dt = nvl_total / dt_ex_vat
  
  // NC xưởng baseline 11%, adjusted by customer type
  const nc_mult = NC_MULTIPLIERS[input.customer_type] || 1.0
  const nc_xuong_base = 0.11
  const nc_xuong = dt_ex_vat * nc_xuong_base * nc_mult
  const nc_xuong_pct = nc_xuong / dt_ex_vat
  
  // NC lắp đặt baseline 9%, adjusted by customer type and timeline
  const nc_lapdat_base = 0.09
  const nc_lapdat = dt_ex_vat * nc_lapdat_base * nc_mult
  const nc_lapdat_pct = nc_lapdat / dt_ex_vat
  
  // Distance costs
  const { di_lai: di_lai_an_o, van_chuyen } = calcDistanceCost(input.location_km, input.timeline_months)
  
  // CP chung (2.8% DT)
  const cp_chung = dt_ex_vat * 0.028
  
  // Capital cost
  const capital_cost = calculateCapitalCost(input)
  
  const total = nvl_total + nc_xuong + nc_lapdat + di_lai_an_o + van_chuyen + capital_cost.total + cp_chung
  
  return {
    nvl_base,
    nvl_buffer: nvl_buffer_amt,
    nvl_total,
    nvl_pct_of_dt,
    nc_xuong,
    nc_xuong_pct,
    nc_lapdat,
    nc_lapdat_pct,
    di_lai_an_o,
    van_chuyen,
    capital_cost,
    cp_chung,
    total
  }
}

export function calculateMargin(input: QuotationInput, cost: CostBreakdown): MarginScenario {
  const dt_ex_vat = input.contract_value / 1.1
  const base_margin = (dt_ex_vat - cost.total) / dt_ex_vat
  
  return {
    low: base_margin - 0.05,   // worst case: chi phí tăng thêm 5%
    mid: base_margin,
    high: base_margin + 0.03,  // best case: tiết kiệm được 3%
  }
}

export function getRiskLevel(margin: MarginScenario, input: QuotationInput, cost: CostBreakdown): 'GREEN' | 'AMBER' | 'RED' {
  // Luôn RED nếu là hospitality hoặc dự án lớn
  if (input.customer_type === 'Nội thất khách sạn' || 
      (input.customer_type === 'Dự án' && input.contract_value > 5000000000)) {
    if (margin.mid < 0.15) return 'RED'
  }
  
  // NVL quá cao
  if (cost.nvl_pct_of_dt > RISK_FACTORS.nvl_alert_red) return 'RED'
  
  // Margin check
  if (margin.mid >= RISK_FACTORS.margin_green) return 'GREEN'
  if (margin.mid >= RISK_FACTORS.margin_amber_low) return 'AMBER'
  return 'RED'
}
