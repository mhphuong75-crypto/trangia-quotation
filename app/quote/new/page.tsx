'use client'
'use client'
import { useState } from 'react'

const HANG_MUC = [
  { id: 'tu_ao', label: 'Tủ áo / tủ quần áo' },
  { id: 'tu_bep', label: 'Tủ bếp (trên + dưới)' },
  { id: 'vach', label: 'Vách ngăn / vách ốp / CNC' },
  { id: 'cua', label: 'Cửa (phòng / vệ sinh / chống cháy)' },
  { id: 'ban_ghe', label: 'Bàn / ghế / kệ' },
  { id: 'giuong', label: 'Giường / nội thất phòng ngủ' },
  { id: 'lavabo', label: 'Tủ lavabo / gương / phòng tắm' },
  { id: 'khac', label: 'Hạng mục khác' },
]

const CUSTOMER_TYPES = [
  'Nội thất nhà dân', 'Nội thất Văn phòng', 'Nội thất khách sạn',
  'Dự án', 'Nội thất cửa hàng', 'Nội thất trường học', 'Nội thất Spa'
]

const PROVINCES = ['Hà Nội', 'HCM', 'Hải Phòng', 'Quảng Ninh', 'Ninh Bình',
  'Hải Dương', 'Bắc Ninh', 'Hưng Yên', 'Hòa Bình', 'Thái Nguyên',
  'Thanh Hoá', 'Nghệ An', 'Đà Nẵng', 'Khác']

const ROLES = ['GĐ Tính giá', 'GĐ Dự án', 'GĐ Bán hàng', 'Khác']

// Cảnh báo năng lực sản xuất theo quy mô đơn + timeline
function estimateProductionLoad(contractValue: number, timelineMonths: number, hangMuc: string[]) {
  const val = contractValue // triệu VND
  const numHangMuc = hangMuc.length
  
  // Estimate số thợ cần dựa trên giá trị + hạng mục
  let thuCong = 0
  if (val < 200) thuCong = 2
  else if (val < 500) thuCong = 4
  else if (val < 1000) thuCong = 7
  else if (val < 3000) thuCong = 12
  else thuCong = 20

  // Nhiều hạng mục = phức tạp hơn
  if (numHangMuc >= 4) thuCong = Math.round(thuCong * 1.3)

  const monthlyLoad = thuCong // thợ cần trong timeline
  
  let level: 'low' | 'medium' | 'high' | 'critical'
  let label: string
  let color: string

  if (val < 300 && timelineMonths >= 3) {
    level = 'low'; label = '🟢 Tải nhẹ — phù hợp lịch SX hiện tại'; color = 'text-green-700'
  } else if (val < 800 || timelineMonths >= 4) {
    level = 'medium'; label = '🟡 Tải trung bình — cần confirm với GĐ sản xuất'; color = 'text-amber-700'
  } else if (val < 2000) {
    level = 'high'; label = '🟠 Tải cao — có thể ảnh hưởng đơn hàng đang chạy'; color = 'text-orange-700'
  } else {
    level = 'critical'; label = '🔴 Tải rất cao — PHẢI xác nhận công suất trước khi ký'; color = 'text-red-700'
  }

  return { level, label, color, thuCong, monthlyLoad }
}

// Cảnh báo dòng tiền cho chính đơn hàng
function estimateCashFlow(contractValue: number, tuPct: number, nvlPct: number, timelineMonths: number) {
  const dt = contractValue / 1.1 // trước VAT
  const tuTotal = contractValue * tuPct
  const nvlTotal = dt * nvlPct
  
  // Đỉnh vốn cần ứng = NVL deposit (3 lần × 18%) + NC xưởng tháng đầu - TU nhận được
  const nvlDeposit = nvlTotal * 0.18 // mỗi lần deposit
  const ncXuong = dt * 0.11 * timelineMonths // tổng NC xưởng
  const ncLapdat = dt * 0.09 * timelineMonths
  
  const tongChiPhiUng = nvlDeposit * 2 + ncXuong * 0.3 + ncLapdat * 0.2
  const tuLan1 = tuTotal * 0.5
  const vonCanUngDinh = Math.max(0, tongChiPhiUng - tuLan1)
  
  // CP sử dụng vốn (11.85%/năm × timeline)
  const cpVon = vonCanUngDinh * 0.1185 * (timelineMonths / 12)
  
  // Đã tính vào báo giá chưa
  const cpVonTrongBaoGia = dt * 0.015 // ~1.5% DT ước tính trong cost calculator
  const cpVonChuaTinh = Math.max(0, cpVon - cpVonTrongBaoGia)

  let warning = ''
  let warnLevel: 'ok' | 'amber' | 'red' = 'ok'
  
  if (vonCanUngDinh > 2000) {
    warnLevel = 'red'
    warning = `⚠️ Cần ứng vốn ~${Math.round(vonCanUngDinh)}tr trước khi nhận TU lần 2`
  } else if (vonCanUngDinh > 500) {
    warnLevel = 'amber'  
    warning = `🟡 Cần ứng ~${Math.round(vonCanUngDinh)}tr — kiểm tra dòng tiền tháng đó`
  } else {
    warning = `✅ Vốn ứng ở mức thấp (~${Math.round(vonCanUngDinh)}tr) — TU cover được`
  }

  return {
    vonCanUngDinh: Math.round(vonCanUngDinh),
    cpVon: Math.round(cpVon),
    cpVonChuaTinh: Math.round(cpVonChuaTinh),
    tuLan1: Math.round(tuLan1),
    warning,
    warnLevel
  }
}

export default function NewQuotationPage() {
  const [hangMuc, setHangMuc] = useState<string[]>([])
  const [scopeText, setScopeText] = useState('')
  const [justification, setJustification] = useState('')
  const [form, setForm] = useState({
    customer_type: '',
    location_province: 'Hà Nội',
    location_km: '10',
    site_readiness: 'ready',
    measurement_quality: 'actual',
    timeline_months: '3',
    tu_pct: '0.3',
    nvl_pct: '0.45',
    nvl_buffer_level: 'medium',
    contract_value: '',
    created_by: ''
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [showAI, setShowAI] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleHangMuc = (id: string) => {
    setHangMuc(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const contractValueM = parseFloat(form.contract_value) || 0
  const productionLoad = hangMuc.length > 0 && contractValueM > 0
    ? estimateProductionLoad(contractValueM, parseInt(form.timeline_months) || 3, hangMuc)
    : null

  const cashFlow = contractValueM > 0
    ? estimateCashFlow(contractValueM, parseFloat(form.tu_pct) || 0.3, parseFloat(form.nvl_pct) || 0.45, parseInt(form.timeline_months) || 3)
    : null

  const handleSubmit = async () => {
    if (!form.customer_type || !form.contract_value || !form.created_by || hangMuc.length === 0) {
      setError('Vui lòng điền đầy đủ: loại khách hàng, hạng mục công trình, giá trị HĐ, người tạo')
      return
    }
    setLoading(true); setError('')

    try {
      const productTypeLabel = hangMuc.map(id => HANG_MUC.find(h => h.id === id)?.label).filter(Boolean).join(', ')
      const payload = {
        product_type: productTypeLabel + (scopeText ? ` | ${scopeText}` : ''),
        total_m2: 0,
        customer_type: form.customer_type,
        location_province: form.location_province,
        location_km: parseInt(form.location_km) || 10,
        site_readiness: form.site_readiness,
        measurement_quality: form.measurement_quality,
        timeline_months: parseInt(form.timeline_months) || 3,
        tu_pct: parseFloat(form.tu_pct) || 0.3,
        nvl_pct: parseFloat(form.nvl_pct) || 0.45,
        nvl_buffer_level: form.nvl_buffer_level,
        contract_value: contractValueM * 1e6,
        created_by: form.created_by,
      }
      const res = await fetch('/api/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data); setStep(2)
      setTimeout(() => setShowAI(true), 800)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCEOSubmit = async () => {
    if (result?.risk_level === 'RED' && !justification.trim()) {
      setError('Vui lòng giải thích lý do tiếp tục đơn hàng này mặc dù rủi ro cao')
      return
    }
    // Save justification to quotation
    if (result?.id && justification) {
      await fetch('/api/quotations/justify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, justification })
      })
    }
    setSubmitted(true)
  }

  const ic = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const sl = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  const lb = "block text-sm font-medium text-slate-700 mb-1"

  const riskColor = (level: string) => level === 'GREEN' ? 'risk-green' : level === 'AMBER' ? 'risk-amber' : 'risk-red'
  const fmtM = (n: number) => (n / 1e6).toFixed(1) + 'tr'
  const fmtP = (n: number) => (n * 100).toFixed(1) + '%'

  // === RESULT SCREEN ===
  if (step === 2 && result) {
    const cb = result.cost_breakdown
    const m = result.margin
    const dt = result.dt_before_vat
    const isRed = result.risk_level === 'RED'
    const pl = productionLoad
    const cf = cashFlow

    if (submitted) {
      return (
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <div className="text-xl font-bold text-slate-800 mb-2">Đã gửi cho CEO phê duyệt</div>
          <div className="text-slate-500 mb-6">CEO sẽ nhận thông báo và xem xét báo giá này</div>
          <button onClick={() => { setStep(1); setResult(null); setHangMuc([]); setScopeText(''); setJustification(''); setSubmitted(false); setShowAI(false) }}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800">
            + Tạo báo giá mới
          </button>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Risk header */}
        <div className={`rounded-xl p-5 ${riskColor(result.risk_level)}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-bold text-slate-800">Kết quả phân tích báo giá</div>
              <div className="text-sm text-slate-600 mt-1">{result.input?.product_type?.substring(0, 60)}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{fmtP(m.mid)}</div>
              <div className="text-xs text-slate-500">Margin | {fmtP(m.low)} ~ {fmtP(m.high)}</div>
            </div>
          </div>
          {isRed && form.customer_type === 'Nội thất khách sạn' && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-2 text-xs text-red-800">
              ⚠️ 100% orders khách sạn trong lịch sử Trần Gia đều lỗ (avg −17%)
            </div>
          )}
          {isRed && form.customer_type === 'Dự án' && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-2 text-xs text-red-800">
              ⚠️ 91% orders dự án trong lịch sử Trần Gia đều lỗ (avg −33.6%)
            </div>
          )}
          {contractValueM > 5000 && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-2 text-xs text-red-800 mt-1">
              ⚠️ 100% orders &gt;5 tỷ đều lỗ (avg −48.8%)
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-3">Chi tiết chi phí dự báo</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-600">DT trước VAT</span>
              <span className="font-semibold">{fmtM(dt)}</span>
            </div>
            {[
              ['NVL (gốc + buffer)', cb.nvl_total, cb.nvl_pct_of_dt, 0.55, 0.45],
              ['NC xưởng', cb.nc_xuong, cb.nc_xuong_pct, 0.22, 0.18],
              ['NC lắp đặt', cb.nc_lapdat, cb.nc_lapdat_pct, 0.197, 0.14],
            ].map(([label, val, pct, red, amber]: any) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">
                  {fmtM(val)}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${pct > red ? 'badge-red' : pct > amber ? 'badge-amber' : 'badge-green'}`}>
                    {fmtP(pct)}
                  </span>
                </span>
              </div>
            ))}
            <div className="flex justify-between text-slate-500">
              <span>Đi lại + ăn ở ({form.location_km}km)</span>
              <span>{fmtM(cb.di_lai_an_o + cb.van_chuyen)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>CP vốn (BLTU + BLTHHĐ + lãi vay)</span>
              <span>{fmtM(cb.capital_cost.total)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
              <span>Tổng chi phí</span><span>{fmtM(cb.total)}</span>
            </div>
            <div className={`border-t-2 pt-2 flex justify-between font-bold text-lg ${m.mid >= 0.2 ? 'text-green-700' : m.mid >= 0.1 ? 'text-amber-700' : 'text-red-700'}`}>
              <span>Lợi nhuận dự báo</span>
              <span>{fmtM(dt - cb.total)} ({fmtP(m.mid)})</span>
            </div>
          </div>
        </div>

        {/* Cảnh báo năng lực sản xuất */}
        {pl && (
          <div className={`bg-white rounded-xl border p-4 ${pl.level === 'critical' ? 'border-red-300' : pl.level === 'high' ? 'border-orange-300' : pl.level === 'medium' ? 'border-amber-200' : 'border-green-200'}`}>
            <div className="font-semibold text-slate-700 mb-2">🏭 Cảnh báo năng lực sản xuất</div>
            <div className={`font-medium text-sm ${pl.color}`}>{pl.label}</div>
            <div className="text-xs text-slate-500 mt-1">
              Ước tính đơn này cần ~{pl.thuCong} thợ trong {form.timeline_months} tháng
              {hangMuc.length >= 4 && ' (nhiều hạng mục — phức tạp hơn dự kiến)'}
            </div>
            {(pl.level === 'high' || pl.level === 'critical') && (
              <div className="text-xs text-red-600 mt-1 font-medium">
                → Cần GĐ sản xuất xác nhận trước khi CEO ký
              </div>
            )}
          </div>
        )}

        {/* Cảnh báo dòng tiền */}
        {cf && (
          <div className={`bg-white rounded-xl border p-4 ${cf.warnLevel === 'red' ? 'border-red-300' : cf.warnLevel === 'amber' ? 'border-amber-200' : 'border-green-200'}`}>
            <div className="font-semibold text-slate-700 mb-2">💰 Cảnh báo dòng tiền — Đơn hàng này</div>
            <div className={`font-medium text-sm ${cf.warnLevel === 'red' ? 'text-red-700' : cf.warnLevel === 'amber' ? 'text-amber-700' : 'text-green-700'}`}>
              {cf.warning}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-slate-600">
              <div className="bg-slate-50 rounded p-2">
                <div className="font-medium">Đỉnh vốn cần ứng</div>
                <div className="text-base font-bold text-slate-800">{cf.vonCanUngDinh}tr</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="font-medium">TU lần 1 nhận được</div>
                <div className="text-base font-bold text-green-700">+{cf.tuLan1}tr</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="font-medium">CP sử dụng vốn</div>
                <div className="text-base font-bold text-red-600">{cf.cpVon}tr</div>
                {cf.cpVonChuaTinh > 50 && <div className="text-red-500 text-xs">⚠️ Chênh ~{cf.cpVonChuaTinh}tr chưa đủ trong báo giá</div>}
              </div>
            </div>
          </div>
        )}

        {/* AI narrative */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-2">🤖 Phân tích rủi ro từ lịch sử đơn hàng</div>
          {!showAI ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              Đang phân tích pattern từ 56 orders...
            </div>
          ) : (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.ai_narrative}</div>
          )}
        </div>

        {/* Trigger questions */}
        {showAI && result.trigger_questions?.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <div className="font-semibold text-blue-800 mb-2">💬 Câu hỏi cần trả lời trước khi ký HĐ</div>
            <div className="space-y-2">
              {result.trigger_questions.map((q: string, i: number) => (
                <div key={i} className="bg-white rounded p-2 text-sm text-slate-700 border border-blue-100">
                  <span className="font-medium text-blue-700">Q{i+1}:</span> {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Giải trình khi RED */}
        {isRed && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-5">
            <div className="font-semibold text-red-800 mb-1">⚠️ Đơn hàng Báo động Đỏ — Cần giải trình</div>
            <div className="text-sm text-red-600 mb-3">
              Trước khi gửi CEO, hãy giải thích tại sao đơn hàng này nên được tiếp tục.
              CEO sẽ đọc nội dung này khi ra quyết định.
            </div>
            <textarea
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              rows={3}
              placeholder="VD: Khách hàng đã đồng ý tăng TU lên 35% và ký cam kết thanh toán theo milestone. NVL đã được confirm giá cố định 3 tháng với nhà cung cấp. Đây là khách hàng chiến lược có thể mang thêm 3-4 đơn tiếp theo..."
              value={justification}
              onChange={e => setJustification(e.target.value)}
            />
            {justification.length > 0 && justification.length < 50 && (
              <div className="text-xs text-red-500 mt-1">Cần tối thiểu 50 ký tự ({justification.length}/50)</div>
            )}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">❌ {error}</div>}

        {/* Zalo share for RED/AMBER */}
        {(isRed || result.risk_level === 'AMBER') && result.id && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700 mb-2">📱 Gửi cho CEO qua Zalo</div>
            <div className="text-xs text-slate-500 mb-3">Copy tin nhắn bên dưới và paste vào Zalo cho CEO:</div>
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-700 font-mono leading-relaxed select-all">
              {`${isRed ? '🔴 BÁO ĐỘNG ĐỎ' : '🟡 BÁO ĐỘNG VÀNG'} — Cần phê duyệt báo giá\n\nLoại KH: ${form.customer_type}\nGiá trị: ${contractValueM}M VND\nMargin: ${(result.margin.mid * 100).toFixed(1)}%\n\nXem & duyệt:\nhttps://trangia-quotation-pmrawch76-trangiafurnitures.vercel.app/quote/${result.id}`}
            </div>
            <button
              onClick={() => {
                const text = `${isRed ? '🔴 BÁO ĐỘNG ĐỎ' : '🟡 BÁO ĐỘNG VÀNG'} — Cần phê duyệt báo giá\n\nLoại KH: ${form.customer_type}\nGiá trị: ${contractValueM}M VND\nMargin: ${(result.margin.mid * 100).toFixed(1)}%\n\nXem & duyệt:\nhttps://trangia-quotation-pmrawch76-trangiafurnitures.vercel.app/quote/${result.id}`
                navigator.clipboard.writeText(text).then(() => alert('✅ Đã copy! Paste vào Zalo cho CEO'))
              }}
              className="mt-2 w-full bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded-lg text-sm hover:bg-blue-100 font-medium">
              📋 Copy tin nhắn
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { setStep(1); setResult(null); setShowAI(false); setJustification('') }}
            className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 font-medium">
            ← Tạo báo giá mới
          </button>
          <button
            onClick={handleCEOSubmit}
            disabled={isRed && justification.trim().length < 50}
            className="flex-2 bg-blue-700 text-white py-3 px-6 rounded-xl hover:bg-blue-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            {isRed ? '📋 Gửi CEO phê duyệt (kèm giải trình)' : result.risk_level === 'AMBER' ? '📋 Gửi CEO phê duyệt' : '✅ Lưu & Tiếp tục'}
          </button>
        </div>
      </div>
    )
  }

  // === FORM SCREEN ===
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Tạo báo giá mới</h1>
        <p className="text-sm text-slate-500 mt-1">Điền thông tin công trình — hệ thống tự tính chi phí và cảnh báo rủi ro</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">❌ {error}</div>}

      <div className="space-y-4">
        {/* Section 1: Công trình */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">① Thông tin công trình</div>

          {/* Hạng mục — multi-select */}
          <div className="mb-4">
            <label className={lb}>Hạng mục trong công trình * <span className="text-xs text-slate-400 font-normal">(chọn tất cả hạng mục)</span></label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {HANG_MUC.map(h => (
                <button key={h.id} type="button"
                  onClick={() => toggleHangMuc(h.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                    hangMuc.includes(h.id)
                      ? 'bg-blue-700 text-white border-blue-700 font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}>
                  {hangMuc.includes(h.id) ? '✓ ' : ''}{h.label}
                </button>
              ))}
            </div>
            {hangMuc.length > 0 && (
              <div className="text-xs text-blue-600 mt-1">{hangMuc.length} hạng mục đã chọn</div>
            )}
          </div>

          {/* Mô tả scope tự do */}
          <div className="mb-4">
            <label className={lb}>Mô tả chi tiết (tùy chọn)</label>
            <input type="text" className={ic}
              placeholder="VD: 3 phòng ngủ, tủ áo 4 cánh, bếp chữ L, 5 cửa phòng..."
              value={scopeText} onChange={e => setScopeText(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lb}>Loại khách hàng *</label>
              <select className={sl} value={form.customer_type} onChange={e => f('customer_type', e.target.value)}>
                <option value="">— Chọn —</option>
                {CUSTOMER_TYPES.map(t => (
                  <option key={t} value={t}>
                    {(t === 'Nội thất khách sạn' || t === 'Dự án') ? '⚠️ ' : ''}{t}
                  </option>
                ))}
              </select>
              {(form.customer_type === 'Nội thất khách sạn' || form.customer_type === 'Dự án') && (
                <div className="text-xs text-red-600 mt-1">
                  {form.customer_type === 'Nội thất khách sạn' ? '100% orders khách sạn bị lỗ' : '91% orders dự án bị lỗ'} — CEO phải duyệt
                </div>
              )}
            </div>
            <div>
              <label className={lb}>Người lập báo giá *</label>
              <select className={sl} value={form.created_by} onChange={e => f('created_by', e.target.value)}>
                <option value="">— Chọn —</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Địa điểm */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">② Địa điểm & Mặt bằng</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lb}>Tỉnh/TP công trình</label>
              <select className={sl} value={form.location_province} onChange={e => f('location_province', e.target.value)}>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={lb}>Khoảng cách từ xưởng (km)</label>
              <input type="number" className={ic} placeholder="VD: 30" value={form.location_km} onChange={e => f('location_km', e.target.value)} />
              {parseInt(form.location_km) > 50 && (
                <div className="text-xs text-amber-600 mt-1">⚠️ &gt;50km — CP đi lại+ăn ở sẽ tính tự động</div>
              )}
            </div>
            <div>
              <label className={lb}>Tình trạng mặt bằng *</label>
              <select className={sl} value={form.site_readiness} onChange={e => f('site_readiness', e.target.value)}>
                <option value="ready">✅ Đã có / bàn giao đúng hạn</option>
                <option value="unclear">⚠️ Chưa rõ ngày bàn giao</option>
                <option value="not_ready">❌ Chưa có mặt bằng</option>
              </select>
            </div>
            <div>
              <label className={lb}>Chất lượng đo đạc *</label>
              <select className={sl} value={form.measurement_quality} onChange={e => f('measurement_quality', e.target.value)}>
                <option value="actual">✅ Đã đo thực tế tại công trình</option>
                <option value="drawing">⚠️ Theo bản vẽ (chưa đo thực tế)</option>
                <option value="none">❌ Chưa có số liệu đo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Tài chính */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-4">③ Tài chính & Chi phí</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lb}>Giá trị HĐ (triệu VND, sau VAT) *</label>
              <input type="number" className={ic} placeholder="VD: 500" value={form.contract_value} onChange={e => f('contract_value', e.target.value)} />
              {contractValueM > 5000 && (
                <div className="text-xs text-red-600 mt-1">⚠️ &gt;5 tỷ — 100% orders lỗ trong lịch sử</div>
              )}
            </div>
            <div>
              <label className={lb}>Timeline thực hiện (tháng)</label>
              <input type="number" className={ic} placeholder="VD: 4" value={form.timeline_months} onChange={e => f('timeline_months', e.target.value)} />
            </div>
            <div>
              <label className={lb}>Tỷ lệ TU (% HĐ sau VAT)</label>
              <input type="number" step="0.05" className={ic} placeholder="VD: 0.3" value={form.tu_pct} onChange={e => f('tu_pct', e.target.value)} />
              <div className="text-xs text-slate-400 mt-1">VD: 0.3 = TU 30% HĐ</div>
            </div>
            <div>
              <label className={lb}>NVL ước tính (% DT trước VAT)</label>
              <input type="number" step="0.01" className={ic} placeholder="VD: 0.45" value={form.nvl_pct} onChange={e => f('nvl_pct', e.target.value)} />
              {parseFloat(form.nvl_pct) > 0.55 && <div className="text-xs text-red-600 mt-1">🔴 &gt;55% — ngưỡng lỗ</div>}
              {parseFloat(form.nvl_pct) > 0.45 && parseFloat(form.nvl_pct) <= 0.55 && <div className="text-xs text-amber-600 mt-1">⚠️ &gt;45% — cần theo dõi</div>}
            </div>
            <div className="col-span-2">
              <label className={lb}>Buffer biến động giá NVL</label>
              <select className={sl} value={form.nvl_buffer_level} onChange={e => f('nvl_buffer_level', e.target.value)}>
                <option value="low">Thấp (&lt;3 tháng) — +2% NVL</option>
                <option value="medium">Trung bình (3–6 tháng) — +5% NVL</option>
                <option value="high">Cao (&gt;6 tháng) — +8% NVL</option>
              </select>
            </div>
          </div>

          {/* Live preview cảnh báo sản xuất + dòng tiền */}
          {contractValueM > 0 && hangMuc.length > 0 && (
            <div className="mt-4 space-y-2">
              {productionLoad && (
                <div className={`rounded-lg p-3 text-xs ${productionLoad.level === 'critical' ? 'bg-red-50 text-red-700' : productionLoad.level === 'high' ? 'bg-orange-50 text-orange-700' : productionLoad.level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  🏭 <strong>Năng lực SX:</strong> {productionLoad.label}
                </div>
              )}
              {cashFlow && (
                <div className={`rounded-lg p-3 text-xs ${cashFlow.warnLevel === 'red' ? 'bg-red-50 text-red-700' : cashFlow.warnLevel === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  💰 <strong>Dòng tiền:</strong> {cashFlow.warning} | CP vốn: ~{cashFlow.cpVon}tr
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-700 text-white py-4 rounded-xl text-base font-semibold hover:bg-blue-800 disabled:opacity-50">
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
