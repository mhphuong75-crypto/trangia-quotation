'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function QuotationDetailPage() {
  const { id } = useParams()
  const [q, setQ] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then(data => {
        const found = data.find((item: any) => item.id === id)
        setQ(found)
        setLoading(false)
      })
  }, [id])

  const handleApprove = async (action: 'approve' | 'reject') => {
    setApproving(true)
    try {
      await fetch('/api/quotations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, approved_by: 'CEO', reason: note })
      })
      const res = await fetch('/api/quotations')
      const data = await res.json()
      setQ(data.find((item: any) => item.id === id))
    } finally {
      setApproving(false)
    }
  }

  const riskColor = (level: string) => {
    if (level === 'GREEN') return 'risk-green'
    if (level === 'AMBER') return 'risk-amber'
    return 'risk-red'
  }

  const fmtM = (n: number) => (n / 1e6).toFixed(1) + 'tr'
  const fmtPct = (n: number) => (n * 100).toFixed(1) + '%'

  if (loading) return <div className="text-center py-12 text-slate-400">Đang tải...</div>
  if (!q) return <div className="text-center py-12 text-slate-400">Không tìm thấy báo giá</div>

  const cb = q.cost_breakdown

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">Báo giá #{id?.toString().slice(0, 8)}</span>
      </div>

      {/* Risk summary */}
      <div className={`rounded-xl p-5 ${riskColor(q.risk_level)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-800">{q.product_type}</div>
            <div className="text-sm text-slate-600 mt-1">{q.customer_type} | {q.location_province} ({q.location_km}km)</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{fmtPct(q.margin_mid)}</div>
            <div className="text-xs text-slate-500">Margin dự báo</div>
          </div>
        </div>
      </div>

      {/* Cost summary */}
      {cb && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-3">Chi tiết chi phí</div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-600">DT trước VAT</span><span className="font-medium">{fmtM(q.dt_before_vat)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">NVL (gốc + buffer)</span><span>{fmtM(cb.nvl_total)} <span className="text-xs text-slate-400">({fmtPct(cb.nvl_pct_of_dt)})</span></span></div>
            <div className="flex justify-between"><span className="text-slate-600">NC xưởng</span><span>{fmtM(cb.nc_xuong)} <span className="text-xs text-slate-400">({fmtPct(cb.nc_xuong_pct)})</span></span></div>
            <div className="flex justify-between"><span className="text-slate-600">NC lắp đặt</span><span>{fmtM(cb.nc_lapdat)} <span className="text-xs text-slate-400">({fmtPct(cb.nc_lapdat_pct)})</span></span></div>
            <div className="flex justify-between"><span className="text-slate-600">CP vốn tổng</span><span>{fmtM(cb.capital_cost?.total)}</span></div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-2">
              <span>Margin dự báo</span>
              <span className={q.margin_mid >= 0.2 ? 'text-green-700' : q.margin_mid >= 0.1 ? 'text-amber-700' : 'text-red-700'}>
                {fmtPct(q.margin_mid)} ({fmtPct(q.margin_low)} ~ {fmtPct(q.margin_high)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Narrative */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="font-semibold text-slate-700 mb-3">🤖 Phân tích rủi ro AI</div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{q.ai_narrative}</div>
      </div>

      {/* Approval section */}
      {!q.approved_by && !q.rejected_by ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-700 mb-3">🔐 Phê duyệt CEO</div>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Ghi chú (tùy chọn)..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={() => handleApprove('approve')}
              disabled={approving}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
            >
              ✅ Phê duyệt
            </button>
            <button
              onClick={() => handleApprove('reject')}
              disabled={approving}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
            >
              ❌ Từ chối
            </button>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl p-4 ${q.approved_by ? 'risk-green' : 'risk-red'}`}>
          <div className="font-medium">
            {q.approved_by ? `✅ Đã phê duyệt bởi ${q.approved_by}` : `❌ Từ chối bởi ${q.rejected_by}`}
          </div>
          {q.rejection_reason && <div className="text-sm text-slate-600 mt-1">Lý do: {q.rejection_reason}</div>}
        </div>
      )}
    </div>
  )
}
