import { QuotationInput, CostBreakdown, MarginScenario, SimilarOrder } from './types'
import { RISK_FACTORS } from './cost-calculator'

const SYSTEM_PROMPT = `Bạn là AI phân tích rủi ro báo giá nội thất cho công ty Trần Gia (Hà Nội).
Nhiệm vụ: Phân tích ngắn gọn, thực tế, dựa trên DATA thực tế của công ty.

RULES:
- Tối đa 3 bullet points rủi ro
- Mỗi bullet: 1-2 câu, cụ thể với con số
- Tiếng Việt, ngắn gọn
- Không lạc quan hóa nếu data cho thấy rủi ro cao
- Luôn reference đến lịch sử orders tương tự nếu có`

export async function generateAIReview(
  input: QuotationInput,
  cost: CostBreakdown,
  margin: MarginScenario,
  similarOrders: SimilarOrder[],
  riskLevel: string
): Promise<{ narrative: string; triggerQuestions: string[] }> {
  
  const dt_ex_vat = input.contract_value / 1.1
  
  // Context về lịch sử
  const historyContext = similarOrders.length > 0 
    ? `${similarOrders.length} đơn tương tự: ${similarOrders.filter(o => o.loai === 'LAI').length} lãi, ${similarOrders.filter(o => o.loai === 'LO').length} lỗ. NC lắp đặt avg thực tế: ${(similarOrders.reduce((a, b) => a + b.nc_lapdat_pct, 0) / similarOrders.length * 100).toFixed(1)}%`
    : 'Không có đơn tương tự trong lịch sử'

  // Cảnh báo đặc biệt
  const warnings = []
  if (input.customer_type === 'Nội thất khách sạn') {
    warnings.push('⚠️ CẢNH BÁO: 100% orders khách sạn trong lịch sử TG bị lỗ (avg −17%)')
  }
  if (input.customer_type === 'Dự án') {
    warnings.push('⚠️ CẢNH BÁO: 91% orders dự án bị lỗ (avg −33.6%)')
  }
  if (input.contract_value > 5_000_000_000) {
    warnings.push('⚠️ CẢNH BÁO: 100% orders >5 tỷ trong lịch sử bị lỗ (avg −48.8%)')
  }
  if (cost.nvl_pct_of_dt > RISK_FACTORS.nvl_alert_red) {
    warnings.push(`⚠️ NVL/DT = ${(cost.nvl_pct_of_dt*100).toFixed(1)}% > ngưỡng lỗ ${(RISK_FACTORS.nvl_alert_red*100).toFixed(0)}%`)
  }
  if (input.measurement_quality !== 'actual') {
    warnings.push('⚠️ Chưa đo thực tế tại công trình — rủi ro sai số dẫn đến làm lại')
  }
  if (input.site_readiness === 'not_ready') {
    warnings.push(`⚠️ Mặt bằng chưa có — CP chờ việc ước tính ${Math.round(15 * 111)}tr/tháng nếu chậm`)
  }

  const prompt = `
Phân tích báo giá:
- Loại KH: ${input.customer_type}
- Giá trị HĐ: ${(input.contract_value/1e6).toFixed(0)} triệu (sau VAT)
- DT trước VAT: ${(dt_ex_vat/1e6).toFixed(0)} triệu
- NVL/DT: ${(cost.nvl_pct_of_dt*100).toFixed(1)}% (ngưỡng lỗ: 58%)
- NC lắp đặt/DT: ${(cost.nc_lapdat_pct*100).toFixed(1)}% (ngưỡng lỗ: 19.7%)
- CP vốn tổng: ${(cost.capital_cost.total/1e6).toFixed(0)} triệu
- Khoảng cách: ${input.location_km}km
- Timeline: ${input.timeline_months} tháng
- Margin dự báo: ${(margin.low*100).toFixed(1)}% / ${(margin.mid*100).toFixed(1)}% / ${(margin.high*100).toFixed(1)}%
- Risk level: ${riskLevel}
- Lịch sử: ${historyContext}
${warnings.length > 0 ? '\nCẢNH BÁO:\n' + warnings.join('\n') : ''}

Viết ĐÚNG 3 bullet points rủi ro chính. Format:
• [Rủi ro 1]: [mô tả + số liệu cụ thể]
• [Rủi ro 2]: [mô tả + số liệu cụ thể]  
• [Rủi ro 3]: [mô tả + số liệu cụ thể]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    
    const data = await response.json()
    const narrative = data.content?.[0]?.text || 'Không thể tạo phân tích. Vui lòng kiểm tra API key.'
    
    // Generate trigger questions based on missing/risky data
    const triggerQuestions: string[] = []
    
    if (cost.nc_lapdat_pct < 0.12 && input.location_km > 50) {
      triggerQuestions.push(`Đơn cách xưởng ${input.location_km}km nhưng NC lắp đặt chỉ báo ${(cost.nc_lapdat_pct*100).toFixed(1)}%. Lịch sử đơn xa: NC thực tế cao hơn 40% dự báo. Bạn đã tính CP đi lại và ăn ở 15 thợ × ${input.timeline_months} tháng chưa?`)
    }
    
    if (input.site_readiness !== 'ready') {
      triggerQuestions.push(`Mặt bằng ${input.site_readiness === 'unclear' ? 'chưa rõ ngày bàn giao' : 'chưa có'}. Mỗi tuần chờ = ~${Math.round(15 * 111 / 4)}tr CP chờ việc. HĐ có điều khoản phạt nếu mặt bằng chậm không?`)
    }
    
    if (input.measurement_quality !== 'actual') {
      triggerQuestions.push(`Đo theo bản vẽ, chưa đo thực tế công trình. 3/10 đơn tương tự phải mang hàng về sửa, tốn thêm 1-2 tuần + CP vận chuyển. Có thể đo thực tế trước khi ký không?`)
    }
    
    if (margin.mid < 0.10) {
      triggerQuestions.push(`Margin dự báo ${(margin.mid*100).toFixed(1)}% — dưới ngưỡng RED 10%. Nếu NC tăng thêm 20% (pattern lịch sử) thì margin còn ${((margin.mid - 0.05)*100).toFixed(1)}%. Có thể tăng giá hoặc giảm scope không?`)
    }
    
    return { narrative, triggerQuestions }
    
  } catch (error) {
    const fallbackNarrative = warnings.length > 0 
      ? warnings.join('\n')
      : `• Margin ${(margin.mid*100).toFixed(1)}% — cần review trước khi ký\n• NVL/DT ${(cost.nvl_pct_of_dt*100).toFixed(1)}% — ${cost.nvl_pct_of_dt > 0.55 ? 'NGUY HIỂM' : 'cần theo dõi'}\n• CP vốn ${(cost.capital_cost.total/1e6).toFixed(0)}tr chưa được phân bổ vào báo giá`
    
    return { narrative: fallbackNarrative, triggerQuestions: [] }
  }
}
