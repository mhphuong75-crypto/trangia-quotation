'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRODUCT_TYPES = [
  'Tủ áo', 'Tủ bếp', 'Tủ gương lavabo', 'Tủ rượu', 'Tủ tài liệu', 'Tủ thấp', 'Tủ locker',
  'Giá sách', 'Vách ốp tường / CNC', 'Cửa thông phòng', 'Cửa vệ sinh', 'Cửa chống cháy', 'Trần',
  'Bàn đảo bếp', 'Bàn học', 'Bàn làm việc', 'Bàn trà', 'Ghế băng', 'Giường', 'Táp đầu giường',
  'Lavabo', 'Hộp rèm', 'Cầu thang', 'Đảo phụ kiện / tủ trang sức',
  'Tủ bếp - Dự án', 'Tủ áo - Dự án', 'Cửa - Dự án', 'Hệ tủ trưng bày'
]

const CUSTOMER_TYPES = [
  'Nội thất nhà dân', 'Nội thất Văn phòng', 'Nội thất khách sạn',
  'Dự án', 'Nội thất cửa hàng', 'Nội thất trường học', 'Nội thất Spa'
]

const PROVINCES = ['Hà Nội', 'HCM', 'Hải Phòng', 'Quảng Ninh', 'Ninh Bình', 'Hải Dương', 'Bắc Ninh', 'Hưng Yên', 'Hòa Bình', 'Thái Nguyên', 'Thanh Hoá', 'Nghệ An', 'Đà Nẵng', 'Khác']

const ROLES = ['GĐ Tính giá', 'GĐ Dự án', 'GĐ Bán hàng', 'CEO']

interface FormState {
  product_type: string
  total_m2: string
  num_rooms: string
  customer_type: string
  location_province: string
  location_km: string
  site_readiness: string
  measurement_quality: string
  timeline_months: string
  tu_pct: string
  nvl_pct: string
  nvl_buffer_level: string
  contract_value: string
  created_by: string
}

interface QuotationResult {
  id?: string
  cost_breakdown: any
  dt_before_vat: number
  margin: { low: number; mid: number; high: number }
  risk_level: string
  ai_narrative: string
  trigger_questions: string[]
  similar_orders: any[]
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    product_type: '', total_m2: '', num_rooms: '', customer_type: '',
    location_province: 'Hà Nội', location_km: '10',
    site_readiness: 'ready', measurement_quality: 'actual',
    timeline_months: '3', tu_pct: '0.3', nvl_pct: '0.45',
    nvl_buffer_level: 'medium', contract_value: '', created_by: ''
  })

  const [result, setResult] = useState<QuotationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1=form, 2=result
  const [showAI, setShowAI] = useState(false)

  const f = (key: keyof FormState, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    if (!form.product_type || !form.customer_type || !form.contract_value || !form.created_by) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    setLoading(true)
    setError('')
    setShowAI(false)

    try {
      const payload = {
        product_type: form.product_type,
        total_m2: parseFloat(form.total_m2) || 0,
        num_rooms: parseInt(form.num_rooms) || 0,
        customer_type: form.customer_type,
        location_province: form.location_province,
        location_km: parseInt(form.location_km) || 10,
        site_readiness: form.site_readiness,
        measurement_quality: form.measurement_quality,
        timeline_months: parseInt(form.timeline_months) || 3,
        tu_pct: parseFloat(form.tu_pct) || 0.3,
        nvl_pct: parseFloat(form.nvl_pct) || 0.45,
        nvl_buffer_level: form.nvl_buffer_level,
        contract_value: parseFloat(form.contract_value.replace(/,/g, '')) * 1e6,
        created_by: form.created_by,
      }

      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setResult(data)
      setStep(2)
      setTimeout(() => setShowAI(true), 800)  // AI review appears with delay for effect
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const riskColor = (level: string) => {
    if (level === 'GREEN') return 'risk-green'
    if (level === 'AMBER') return 'risk-amber'
    return 'risk-red'
  }

  const riskBadge = (level: string) => {
    if (level === 'GREEN') return <span className="badge-green px-3 py-1 rounded-full font-semibold">✅ GREEN — An toàn</span>
    if (level === 'AMBER') return <span className="badge-amber px-3 py-1 rounded-full font-semibold">⚠️ AMBER — Cần xem xét</span>
    return <span className="badge-red px-3 py-1 rounded-full font-semibold">🔴 RED — CEO phải duyệt</span>
  }

  const fmtM = (n: number) => (n / 1e6).toFixed(1) + 'tr'
  const fmtPct = (n: number) => (n * 100).toFixed(1) + '%'

  const input = {
    class: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
    select: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
    label: "block text-sm font-medium text-slate-700 mb-1",
    group: "space-y-1",
  }

  if (step === 2 && result) {
    const cb = result.cost_breakdown
    const m = result.margin
    const dt = result.dt_before_vat
    const isRed = result.risk_level === 'RED'
    const isAmber = result.risk_level === 'AMBER'

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Risk header */}
        <div className={`rounded-xl p-6 ${riskColor(result.risk_level)}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold text-slate-800 mb-1">Kết quả phân tích báo giá</div>
              {riskBadge(result.risk_level)}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-800">{fmtPct(m.mid)}</div>
              <div className="text-sm text-slate-500">Margin dự báo</div>
              <div className="text-xs text-slate-400 mt-1">
                Thấp: {fmtPct(m.low)} | Cao: {fmtPct(m.high)}
              </div>
            </div>
          </div>

          {/* Special warnings */}
          {form.customer_type === 'Nội thất khách sạn' && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-sm text-red-800 mt-2">
              ⚠️ <strong>Cảnh báo đặc biệt:</strong> 100% orders khách sạn trong lịch sử Trần Gia đều lỗ (avg −17%). Đây không phải ngưỡng — đây là pattern thực tế 100%.
            </div>
          )}
          {form.customer_type === 'Dự án' && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-sm text-red-800 mt-2">
              ⚠️ <strong>Cảnh báo đặc biệt:</strong> 91% orders dự án trong lịch sử Trần Gia đều lỗ (avg −33.6%).
            </div>
          )}
          {parseFloat(form.contract_value) > 5000 && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-sm text-red-800 mt-2">
              ⚠️ <strong>Cảnh báo đặc biệt:</strong> 100% orders {'>'}5 tỷ trong lịch sử Trần Gia đều lỗ (avg −48.8%).
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">Chi tiết chi phí dự báo</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">DT trước VAT</span>
              <span className="font-semibold">{fmtM(dt)}</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-600">NVL (gốc + buffer)</span>
                <span className="font-medium">
                  {fmtM(cb.nvl_total)}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${cb.nvl_pct_of_dt > 0.55 ? 'badge-red' : cb.nvl_pct_of_dt > 0.45 ? 'badge-amber' : 'badge-green'}`}>
                    {fmtPct(cb.nvl_pct_of_dt)}
                  </span>
                </span>
              </div>
              <div className="text-xs text-slate-400 ml-4">→ Gốc: {fmtM(cb.nvl_base)} + Buffer: {fmtM(cb.nvl_buffer)}</div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">NC xưởng</span>
              <span className="font-medium">
                {fmtM(cb.nc_xuong)}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${cb.nc_xuong_pct > 0.22 ? 'badge-red' : cb.nc_xuong_pct > 0.18 ? 'badge-amber' : 'badge-green'}`}>
                  {fmtPct(cb.nc_xuong_pct)}
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">NC lắp đặt</span>
              <span className="font-medium">
                {fmtM(cb.nc_lapdat)}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${cb.nc_lapdat_pct > 0.197 ? 'badge-red' : cb.nc_lapdat_pct > 0.14 ? 'badge-amber' : 'badge-green'}`}>
                  {fmtPct(cb.nc_lapdat_pct)}
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Đi lại + ăn ở ({parseInt(form.location_km)}km)</span>
              <span>{fmtM(cb.di_lai_an_o)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Vận chuyển</span>
              <span>{fmtM(cb.van_chuyen)}</span>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-600">CP vốn (BLTU + BLTHHĐ + lãi vay)</span>
                <span>{fmtM(cb.capital_cost.total)}</span>
              </div>
              <div className="text-xs text-slate-400 ml-4 mt-1 space-y-0.5">
                <div>→ Phí BLTU: {fmtM(cb.capital_cost.bltu_fee)}</div>
                <div>→ Phí BLTHHĐ: {fmtM(cb.capital_cost.blthhd_fee)}</div>
                <div>→ Lãi vay: {fmtM(cb.capital_cost.interest_cost)}</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">CP chung (2.8%)</span>
              <span>{fmtM(cb.cp_chung)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-base">
              <span>Tổng chi phí</span>
              <span>{fmtM(cb.total)}</span>
            </div>

            <div className={`border-t-2 pt-2 flex justify-between items-center font-bold text-lg ${m.mid >= 0.2 ? 'text-green-700' : m.mid >= 0.1 ? 'text-amber-700' : 'text-red-700'}`}>
              <span>Lợi nhuận dự báo</span>
              <span>{fmtM(dt - cb.total)} ({fmtPct(m.mid)})</span>
            </div>
          </div>
        </div>

        {/* AI Risk Narrative */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-3">🤖 Phân tích rủi ro AI</div>
          {!showAI ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              Đang phân tích pattern lịch sử 56 orders...
            </div>
          ) : (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {result.ai_narrative}
            </div>
          )}
        </div>

        {/* Trigger questions */}
        {showAI && result.trigger_questions.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <div className="font-semibold text-blue-800 mb-3">💬 Câu hỏi cần trả lời trước khi ký HĐ</div>
            <div className="space-y-3">
              {result.trigger_questions.map((q, i) => (
                <div key={i} className="bg-white rounded-lg p-3 text-sm text-slate-700 border border-blue-100">
                  <span className="font-medium text-blue-700">Q{i + 1}:</span> {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar orders */}
        {result.similar_orders.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="font-semibold text-slate-700 mb-3">📊 Đơn hàng tương tự ({form.customer_type})</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="p-2 text-slate-500">Mã ĐH</th>
                  <th className="p-2 text-slate-500">DT</th>
                  <th className="p-2 text-slate-500">NVL/DT</th>
                  <th className="p-2 text-slate-500">NC lắp/DT</th>
                  <th className="p-2 text-slate-500">Margin thực</th>
                  <th className="p-2 text-slate-500">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {result.similar_orders.map((o: any) => (
                  <tr key={o.ma} className="border-b border-slate-50">
                    <td className="p-2 font-mono text-slate-600">{o.ma}</td>
                    <td className="p-2">{(o.dt / 1e6).toFixed(0)}M</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${o.nvl_pct > 0.55 ? 'badge-red' : o.nvl_pct > 0.45 ? 'badge-amber' : 'badge-green'}`}>
                        {(o.nvl_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${o.nc_lapdat_pct > 0.197 ? 'badge-red' : o.nc_lapdat_pct > 0.14 ? 'badge-amber' : 'badge-green'}`}>
                        {(o.nc_lapdat_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className={`p-2 font-medium ${o.margin_sau >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(o.margin_sau * 100).toFixed(1)}%
                    </td>
                    <td className="p-2">
                      {o.loai === 'LAI' ? <span className="text-green-600">✅ Lãi</span> : <span className="text-red-600">❌ Lỗ</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { setStep(1); setResult(null); setShowAI(false); }}
            className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 font-medium"
          >
            ← Tạo báo giá mới
          </button>
          {result.id && (isRed || isAmber) && (
            <button
              onClick={() => router.push(`/quote/${result.id}`)}
              className="flex-2 bg-blue-700 text-white py-3 px-6 rounded-xl hover:bg-blue-800 font-medium"
            >
              📋 Gửi CEO phê duyệt →
            </button>
          )}
          {result.id && !isRed && !isAmber && (
            <button
              className="flex-2 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 font-medium"
            >
              ✅ Lưu & Tiếp tục
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Tạo báo giá mới</h1>
        <p className="text-sm text-slate-500 mt-1">Điền 8 thông số — hệ thống tự tính chi phí và rủi ro</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
          ❌ {error}
        </div>
      )}

      <div className="space-y-4">

        {/* Section 1 - Sản phẩm & Khách hàng */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">① Thông tin đơn hàng</div>
          <div className="grid grid-cols-2 gap-4">
            <div className={input.group}>
              <label className={input.label}>Loại sản phẩm *</label>
              <select className={input.select} value={form.product_type} onChange={e => f('product_type', e.target.value)}>
                <option value="">— Chọn loại sản phẩm —</option>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={input.group}>
              <label className={input.label}>Loại khách hàng *</label>
              <select className={input.select} value={form.customer_type} onChange={e => f('customer_type', e.target.value)}>
                <option value="">— Chọn loại KH —</option>
                {CUSTOMER_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t === 'Nội thất khách sạn' ? '⚠️ ' : t === 'Dự án' ? '⚠️ ' : ''}{t}
                  </option>
                ))}
              </select>
              {(form.customer_type === 'Nội thất khách sạn' || form.customer_type === 'Dự án') && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ {form.customer_type === 'Nội thất khách sạn' ? '100% orders khách sạn bị lỗ' : '91% orders dự án bị lỗ'} — CEO phải duyệt
                </div>
              )}
            </div>
            <div className={input.group}>
              <label className={input.label}>Tổng m² (hoặc số phòng)</label>
              <input type="number" className={input.class} placeholder="VD: 150" value={form.total_m2} onChange={e => f('total_m2', e.target.value)} />
            </div>
            <div className={input.group}>
              <label className={input.label}>Số phòng (nếu có)</label>
              <input type="number" className={input.class} placeholder="VD: 20" value={form.num_rooms} onChange={e => f('num_rooms', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Section 2 - Địa điểm & Mặt bằng */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">② Địa điểm & Mặt bằng</div>
          <div className="grid grid-cols-2 gap-4">
            <div className={input.group}>
              <label className={input.label}>Tỉnh/TP công trình</label>
              <select className={input.select} value={form.location_province} onChange={e => f('location_province', e.target.value)}>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={input.group}>
              <label className={input.label}>Khoảng cách từ xưởng (km)</label>
              <input type="number" className={input.class} placeholder="VD: 30" value={form.location_km} onChange={e => f('location_km', e.target.value)} />
              {parseInt(form.location_km) > 50 && (
                <div className="text-xs text-amber-600 mt-1">⚠️ &gt;50km → ước tính CP đi lại+ăn ở tự động</div>
              )}
            </div>
            <div className={input.group}>
              <label className={input.label}>Tình trạng mặt bằng *</label>
              <select className={input.select} value={form.site_readiness} onChange={e => f('site_readiness', e.target.value)}>
                <option value="ready">✅ Đã có / bàn giao đúng hạn</option>
                <option value="unclear">⚠️ Chưa rõ ngày bàn giao</option>
                <option value="not_ready">❌ Chưa có mặt bằng</option>
              </select>
            </div>
            <div className={input.group}>
              <label className={input.label}>Chất lượng đo đạc *</label>
              <select className={input.select} value={form.measurement_quality} onChange={e => f('measurement_quality', e.target.value)}>
                <option value="actual">✅ Đã đo thực tế tại công trình</option>
                <option value="drawing">⚠️ Theo bản vẽ (chưa đo thực tế)</option>
                <option value="none">❌ Chưa có số liệu đo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 - Tài chính */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">③ Tài chính & Chi phí</div>
          <div className="grid grid-cols-2 gap-4">
            <div className={input.group}>
              <label className={input.label}>Giá trị HĐ (triệu VND, sau VAT) *</label>
              <input type="number" className={input.class} placeholder="VD: 500" value={form.contract_value} onChange={e => f('contract_value', e.target.value)} />
              {form.contract_value && parseFloat(form.contract_value) > 5000 && (
                <div className="text-xs text-red-600 mt-1">⚠️ &gt;5 tỷ → 100% orders lỗ trong lịch sử</div>
              )}
            </div>
            <div className={input.group}>
              <label className={input.label}>Timeline (tháng) *</label>
              <input type="number" className={input.class} placeholder="VD: 4" value={form.timeline_months} onChange={e => f('timeline_months', e.target.value)} />
            </div>
            <div className={input.group}>
              <label className={input.label}>Tỷ lệ TU (% HĐ sau VAT)</label>
              <input type="number" step="0.05" className={input.class} placeholder="VD: 0.3" value={form.tu_pct} onChange={e => f('tu_pct', e.target.value)} />
              <div className="text-xs text-slate-400 mt-1">VD: 0.3 = TU 30% HĐ</div>
            </div>
            <div className={input.group}>
              <label className={input.label}>Tỷ lệ NVL ước tính (% DT ex-VAT)</label>
              <input type="number" step="0.01" className={input.class} placeholder="VD: 0.45" value={form.nvl_pct} onChange={e => f('nvl_pct', e.target.value)} />
              {parseFloat(form.nvl_pct) > 0.55 && <div className="text-xs text-red-600 mt-1">🔴 {'>'} 55% — ngưỡng lỗ</div>}
              {parseFloat(form.nvl_pct) > 0.45 && parseFloat(form.nvl_pct) <= 0.55 && <div className="text-xs text-amber-600 mt-1">⚠️ {'>'} 45% — cần theo dõi</div>}
            </div>
            <div className={input.group}>
              <label className={input.label}>Buffer biến động giá NVL</label>
              <select className={input.select} value={form.nvl_buffer_level} onChange={e => f('nvl_buffer_level', e.target.value)}>
                <option value="low">Thấp (&lt;3 tháng) — +2% NVL</option>
                <option value="medium">Trung bình (3–6 tháng) — +5% NVL</option>
                <option value="high">Cao (&gt;6 tháng) — +8% NVL</option>
              </select>
            </div>
            <div className={input.group}>
              <label className={input.label}>Người tạo báo giá *</label>
              <select className={input.select} value={form.created_by} onChange={e => f('created_by', e.target.value)}>
                <option value="">— Chọn —</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-700 text-white py-4 rounded-xl text-base font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              Đang phân tích...
            </span>
          ) : '🔍 Phân tích chi phí & rủi ro'}
        </button>
      </div>
    </div>
  )
}
