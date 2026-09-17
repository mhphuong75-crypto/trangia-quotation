import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Trần Gia — Hệ thống báo giá',
  description: 'Smart Quotation System — Module A: Cost Gate',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-slate-50">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">TG</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Trần Gia Furniture</div>
                  <div className="text-xs text-slate-500">Hệ thống Báo giá Thông minh</div>
                </div>
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <a href="/" className="text-slate-600 hover:text-blue-700">Dashboard</a>
                <a href="/quote/new" className="bg-blue-700 text-white px-4 py-1.5 rounded-lg hover:bg-blue-800 font-medium">
                  + Tạo báo giá
                </a>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
