'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Quotation {
  id: string
  customer_type: string
  product_type: string
  contract_value: number
  margin_mid: number
  risk_level: 'GREEN' | 'AMBER' | 'RED'
  created_by: string
  approved_by?: string
  rejected_by?: string
  created_at: string
}

const STATS = { total: 56, lai: 15, lo: 41, pct_lai: 27, avg_margin_lai: 23.9, avg_margin_lo: -41.8 }

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/quotations?t=' + Date.now())
      const data = await res.json()
      setQuotations(Array.isArray(data) ? data : [])
    } catch (e) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, lastRefresh])

  // Auto-refresh mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const riskBadge = (level: string) => {
    if (level === 'GREEN') return <span className="badge-green px-2 py-0.5 rounded-full text-xs font-medium">✅ GREEN</span>
    if (level === 'AMBER') return <span className="badge-amber px-2 py-0.5 rounded-full text-xs font-medium">⚠️ AMBER</span>
    return <span className="badge-red px-2 py-0.5 rounded-full text-xs font-medium">🔴 RED</span>
  }

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n / 1e6)) + 'M'

  const pending = quotations.filter(q => !q.approved_by && !q.rejected_by)
  const approved = quotations.filter(q => q.approved_by)
  const rejected = quotations.filter(q => q.rejected_by)
  const redPending = pending.filter(q => q.risk_level === 'RED')

  return (
    <div className="space-y-5">
      {/* Alert nếu có RED chờ duyệt */}
      {redPending.length > 0 && (
        <div className="risk-red rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-red-800">🔴 {redPending.length} báo giá Đỏ đang chờ phê duyệt</div>
            <div className="text-sm text-red-600 mt-0.5">Cần xem xét và quyết định sớm</div>
          </div>
          <Link href={`/quote/${redPending[0].id}`} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
            Xem ngay →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-slate-800">{STATS.total}</div>
          <div className="text-sm text-slate-500 mt-1">Orders lịch sử</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-red-600">{STATS.lo}</div>
          <div className="text-sm text-slate-500 mt-1">Lỗ ({100-STATS.pct_lai}%) avg {STATS.avg_margin_lo}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{STATS.lai}</div>
          <div className="text-sm text-slate-500 mt-1">Lãi ({STATS.pct_lai}%) avg +{STATS.avg_margin_lai}%</div>
        </div>
        <div className="bg-blue-700 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{quotations.length}</div>
          <div className="text-sm text-blue-200 mt-1">Báo giá hệ thống</div>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="text-green-300">{approved.length} duyệt</span>
            <span className="text-red-300">{rejected.length} từ chối</span>
            <span className="text-yellow-300">{pending.length} chờ</span>
          </div>
        </div>
      </div>

      {/* Pattern cảnh báo */}
      <div className="risk-red rounded-xl p-4">
        <div className="font-semibold text-red-800 mb-2">⚠️ Pattern rủi ro từ 56 orders thực tế</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="font-medium text-red-700">Khách sạn</div><div className="text-red-600">0% lãi | avg −17%</div></div>
          <div><div className="font-medium text-red-700">Dự án</div><div className="text-red-600">9% lãi | avg −33.6%</div></div>
          <div><div className="font-medium text-red-700">&gt;5 tỷ</div><div className="text-red-600">0% lãi | avg −48.8%</div></div>
        </div>
      </div>

      {/* Quotations table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold text-slate-700">Báo giá gần đây</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLastRefresh(Date.now())} className="text-xs text-slate-400 hover:text-slate-600">↻ Làm mới</button>
            <Link href="/quote/new" className="text-sm text-blue-700 hover:underline">+ Tạo mới</Link>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-3">Chưa có báo giá nào</div>
            <Link href="/quote/new" className="bg-blue-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-800">Tạo báo giá đầu tiên</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                {['Loại KH', 'Hạng mục', 'Giá trị HĐ', 'Margin', 'Risk', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} className="p-3 text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3 text-slate-600 text-xs">{q.customer_type}</td>
                  <td className="p-3 text-slate-500 text-xs max-w-xs truncate">{q.product_type?.substring(0, 40)}</td>
                  <td className="p-3 font-medium">{fmt(q.contract_value)}</td>
                  <td className="p-3">
                    <span className={q.margin_mid >= 0.2 ? 'text-green-600 font-medium' : q.margin_mid >= 0.1 ? 'text-amber-600' : 'text-red-600 font-medium'}>
                      {(q.margin_mid * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">{riskBadge(q.risk_level)}</td>
                  <td className="p-3">
                    {q.approved_by ? <span className="text-green-600 text-xs font-medium">✅ Đã duyệt</span>
                      : q.rejected_by ? <span className="text-red-600 text-xs font-medium">❌ Từ chối</span>
                      : <Link href={`/quote/${q.id}`} className="text-blue-600 text-xs hover:underline font-medium">Chờ duyệt →</Link>}
                  </td>
                  <td className="p-3 text-slate-400 text-xs">{new Date(q.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
