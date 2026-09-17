'use client'
import { useEffect, useState } from 'react'
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
  created_at: string
}

// Data thực tế từ 56 orders
const STATS = {
  total: 56,
  lai: 15,
  lo: 41,
  pct_lai: 27,
  avg_margin_lai: 23.9,
  avg_margin_lo: -41.8,
}

const RISK_THRESHOLDS = [
  { label: 'NVL/DT', danger: '58%', amber: '45%', safe: '34%' },
  { label: 'NC lắp đặt/DT', danger: '19.7%', amber: '14%', safe: '9.1%' },
  { label: 'NC xưởng/DT', danger: '22.4%', amber: '18%', safe: '13.1%' },
]

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then(data => {
        setQuotations(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const riskBadge = (level: string) => {
    if (level === 'GREEN') return <span className="badge-green px-2 py-0.5 rounded-full text-xs font-medium">✅ GREEN</span>
    if (level === 'AMBER') return <span className="badge-amber px-2 py-0.5 rounded-full text-xs font-medium">⚠️ AMBER</span>
    return <span className="badge-red px-2 py-0.5 rounded-full text-xs font-medium">🔴 RED</span>
  }

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n / 1e6)) + 'M'

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-slate-800">{STATS.total}</div>
          <div className="text-sm text-slate-500 mt-1">Tổng orders lịch sử</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-red-600">{STATS.lo}</div>
          <div className="text-sm text-slate-500 mt-1">Orders lỗ ({100 - STATS.pct_lai}%)</div>
          <div className="text-xs text-red-500 mt-1">avg −{Math.abs(STATS.avg_margin_lo).toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{STATS.lai}</div>
          <div className="text-sm text-slate-500 mt-1">Orders lãi ({STATS.pct_lai}%)</div>
          <div className="text-xs text-green-500 mt-1">avg +{STATS.avg_margin_lai.toFixed(1)}%</div>
        </div>
        <div className="bg-blue-700 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{quotations.length}</div>
          <div className="text-sm text-blue-200 mt-1">Báo giá hệ thống</div>
          <Link href="/quote/new" className="text-xs bg-white text-blue-700 px-2 py-0.5 rounded mt-2 inline-block font-medium hover:bg-blue-50">
            + Tạo mới
          </Link>
        </div>
      </div>

      {/* Warning banner */}
      <div className="risk-red rounded-xl p-4">
        <div className="font-semibold text-red-800 mb-2">⚠️ Pattern rủi ro từ 56 orders thực tế</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-red-700">Khách sạn</div>
            <div className="text-red-600">0% lãi | avg −17%</div>
          </div>
          <div>
            <div className="font-medium text-red-700">Dự án</div>
            <div className="text-red-600">9% lãi | avg −33.6%</div>
          </div>
          <div>
            <div className="font-medium text-red-700">{'>'}5 tỷ</div>
            <div className="text-red-600">0% lãi | avg −48.8%</div>
          </div>
        </div>
      </div>

      {/* Risk thresholds */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="font-semibold text-slate-700 mb-3">Ngưỡng cảnh báo chi phí</div>
        <div className="grid grid-cols-3 gap-4">
          {RISK_THRESHOLDS.map(t => (
            <div key={t.label} className="text-sm">
              <div className="font-medium text-slate-700 mb-1">{t.label}</div>
              <div className="flex gap-2">
                <span className="badge-green px-2 py-0.5 rounded text-xs">{'<'}{t.safe}</span>
                <span className="badge-amber px-2 py-0.5 rounded text-xs">{'>'}{t.amber}</span>
                <span className="badge-red px-2 py-0.5 rounded text-xs">{'>'}{t.danger}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent quotations */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold text-slate-700">Báo giá gần đây</div>
          <Link href="/quote/new" className="text-sm text-blue-700 hover:underline">+ Tạo báo giá mới</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-3">Chưa có báo giá nào</div>
            <Link href="/quote/new" className="bg-blue-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-800">
              Tạo báo giá đầu tiên
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="p-3 text-slate-500 font-medium">Loại KH</th>
                <th className="p-3 text-slate-500 font-medium">Sản phẩm</th>
                <th className="p-3 text-slate-500 font-medium">Giá trị HĐ</th>
                <th className="p-3 text-slate-500 font-medium">Margin dự báo</th>
                <th className="p-3 text-slate-500 font-medium">Risk</th>
                <th className="p-3 text-slate-500 font-medium">Trạng thái</th>
                <th className="p-3 text-slate-500 font-medium">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{q.customer_type}</td>
                  <td className="p-3 text-slate-600">{q.product_type}</td>
                  <td className="p-3 font-medium">{fmt(q.contract_value)}</td>
                  <td className="p-3">
                    <span className={q.margin_mid >= 0.2 ? 'text-green-600 font-medium' : q.margin_mid >= 0.1 ? 'text-amber-600' : 'text-red-600 font-medium'}>
                      {(q.margin_mid * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3">{riskBadge(q.risk_level)}</td>
                  <td className="p-3">
                    {q.approved_by ? (
                      <span className="text-green-600 text-xs">✅ Đã duyệt</span>
                    ) : (
                      <Link href={`/quote/${q.id}`} className="text-blue-600 text-xs hover:underline">Chờ duyệt →</Link>
                    )}
                  </td>
                  <td className="p-3 text-slate-400 text-xs">
                    {new Date(q.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
