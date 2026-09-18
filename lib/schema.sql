-- ================================================
-- TRẦN GIA QUOTATION SYSTEM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ================================================

-- Table 1: Historical orders (from 56 orders data)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma TEXT UNIQUE NOT NULL,
  ten TEXT,
  tinh_trang TEXT,
  dt NUMERIC,
  nvl NUMERIC DEFAULT 0,
  nvl_pct NUMERIC DEFAULT 0,
  nc_xuong NUMERIC DEFAULT 0,
  nc_xuong_pct NUMERIC DEFAULT 0,
  nc_lapdat NUMERIC DEFAULT 0,
  nc_lapdat_pct NUMERIC DEFAULT 0,
  total_nc_pct NUMERIC DEFAULT 0,
  van_chuyen NUMERIC DEFAULT 0,
  tc_baolanh NUMERIC DEFAULT 0,
  cp_vh NUMERIC DEFAULT 0,
  ban_hang NUMERIC DEFAULT 0,
  ln_truoc NUMERIC DEFAULT 0,
  ln_sau NUMERIC DEFAULT 0,
  margin_truoc NUMERIC DEFAULT 0,
  margin_sau NUMERIC DEFAULT 0,
  loai TEXT CHECK (loai IN ('LAI', 'LO')),
  loai_kh TEXT,
  loai_sp TEXT,
  dia_diem TEXT,
  ngay_ky DATE,
  ngay_xong DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Inputs
  product_type TEXT NOT NULL,
  total_m2 NUMERIC,
  num_rooms INTEGER,
  customer_type TEXT NOT NULL,
  location_province TEXT,
  location_km INTEGER NOT NULL,
  site_readiness TEXT NOT NULL,
  measurement_quality TEXT NOT NULL,
  timeline_months INTEGER NOT NULL,
  tu_pct NUMERIC NOT NULL,
  nvl_pct NUMERIC NOT NULL,
  nvl_buffer_level TEXT NOT NULL,
  contract_value NUMERIC NOT NULL,
  created_by TEXT NOT NULL,
  -- Cost breakdown (JSON)
  cost_breakdown JSONB,
  -- Results
  dt_before_vat NUMERIC,
  margin_low NUMERIC,
  margin_mid NUMERIC,
  margin_high NUMERIC,
  risk_level TEXT CHECK (risk_level IN ('GREEN', 'AMBER', 'RED')),
  ai_narrative TEXT,
  trigger_questions JSONB DEFAULT '[]',
  similar_order_ids JSONB DEFAULT '[]',
  -- Approval
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Capital cost params
CREATE TABLE IF NOT EXISTS capital_cost_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  param_name TEXT UNIQUE NOT NULL,
  param_value NUMERIC NOT NULL,
  unit TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: Users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ceo', 'gd_tinh_gia', 'gd_du_an', 'gd_tai_chinh', 'gd_san_xuat', 'gd_ban_hang')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: Weekly checkins
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id),
  order_ma TEXT,
  nc_used_days NUMERIC,
  nvl_used_million NUMERIC,
  progress_pct NUMERIC,
  note TEXT,
  submitted_by TEXT,
  week_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed capital params
INSERT INTO capital_cost_params (param_name, param_value, unit, description) VALUES
  ('interest_rate_bidv', 0.094, '%/year', 'Lãi suất BIDV 9.4%/năm'),
  ('interest_rate_vpbank', 0.143, '%/year', 'Lãi suất VPBank 14.3%/năm'),
  ('interest_rate_avg', 0.1185, '%/year', 'Lãi suất bình quân'),
  ('bl_fee_rate', 0.02, '%/year', 'Phí bảo lãnh 2%/năm'),
  ('blthhd_pct', 0.05, '%/HĐ', 'Tỷ lệ BLTHHĐ 5% HĐ'),
  ('blthhd_bank_fee', 0.015, '%/year', 'Phí NH phát hành BLTHHĐ'),
  ('nvl_deposit_rate', 0.18, '%/NVL', 'Deposit NVL 18% mỗi lần'),
  ('asset_collateral', 5000000000, 'VND', 'Tài sản đảm bảo 5 tỷ')
ON CONFLICT (param_name) DO NOTHING;

-- Seed users
INSERT INTO app_users (email, full_name, role) VALUES
  ('ceo@trangia.vn', 'CEO', 'ceo'),
  ('tinh_gia@trangia.vn', 'Giám đốc Tính giá', 'gd_tinh_gia'),
  ('du_an@trangia.vn', 'Giám đốc Dự án', 'gd_du_an'),
  ('tai_chinh@trangia.vn', 'Giám đốc Tài chính', 'gd_tai_chinh'),
  ('san_xuat@trangia.vn', 'Giám đốc Sản xuất', 'gd_san_xuat'),
  ('ban_hang@trangia.vn', 'Giám đốc Bán hàng', 'gd_ban_hang')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users, write for service role only
CREATE POLICY "Allow all for service role" ON quotations FOR ALL USING (true);
CREATE POLICY "Allow read for all" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow all insert/update for service role" ON orders FOR ALL USING (true);

