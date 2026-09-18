import { NextRequest, NextResponse } from 'next/server'
import { calculateCosts, calculateMargin, getRiskLevel } from '@/lib/cost-calculator'
import { generateAIReview } from '@/lib/ai-review'
import { supabaseAdmin } from '@/lib/supabase'
import { QuotationInput } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const input: QuotationInput = await request.json()
    
    // Validate required fields
    if (!input.contract_value || !input.customer_type || !input.location_km) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }
    
    // Calculate costs
    const costBreakdown = calculateCosts(input)
    const margin = calculateMargin(input, costBreakdown)
    const riskLevel = getRiskLevel(margin, input, costBreakdown)
    const dtBeforeVat = input.contract_value / 1.1
    
    // Find similar orders from history
    let similarOrders: any[] = []
    try {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('ma,ten,dt,nvl_pct,nc_lapdat_pct,margin_sau,loai,loai_kh')
        .eq('loai_kh', input.customer_type)
        .order('created_at', { ascending: false })
        .limit(5)
      similarOrders = orders || []
    } catch (e) {
      // Continue without similar orders
    }
    
    // Generate AI review (async, non-blocking for speed)
    let aiNarrative = ''
    let triggerQuestions: string[] = []
    
    try {
      const aiResult = await generateAIReview(input, costBreakdown, margin, similarOrders, riskLevel)
      aiNarrative = aiResult.narrative
      triggerQuestions = aiResult.triggerQuestions
    } catch (e) {
      aiNarrative = `Risk level: ${riskLevel}. Margin dự báo: ${(margin.mid*100).toFixed(1)}%`
    }
    
    // Save to database
    let quotationId = null
    try {
      const { data } = await supabaseAdmin
        .from('quotations')
        .insert({
          product_type: input.product_type,
          total_m2: input.total_m2,
          num_rooms: input.num_rooms,
          customer_type: input.customer_type,
          location_province: input.location_province,
          location_km: input.location_km,
          site_readiness: input.site_readiness,
          measurement_quality: input.measurement_quality,
          timeline_months: input.timeline_months,
          tu_pct: input.tu_pct,
          nvl_pct: input.nvl_pct,
          nvl_buffer_level: input.nvl_buffer_level,
          contract_value: input.contract_value,
          created_by: input.created_by,
          cost_breakdown: costBreakdown,
          dt_before_vat: dtBeforeVat,
          margin_low: margin.low,
          margin_mid: margin.mid,
          margin_high: margin.high,
          risk_level: riskLevel,
          ai_narrative: aiNarrative,
          trigger_questions: triggerQuestions,
        })
        .select('id')
        .single()
      quotationId = data?.id
    } catch (e) {
      // Continue even if save fails
    }
    
    // Auto-notify Zalo for RED/AMBER
    if (quotationId && (riskLevel === 'RED' || riskLevel === 'AMBER')) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trangia-quotation-pmrawch76-trangiafurnitures.vercel.app'
        fetch(`${baseUrl}/api/notify/zalo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quotation_id: quotationId,
            customer_type: input.customer_type,
            contract_value: input.contract_value,
            margin_mid: margin.mid,
            risk_level: riskLevel,
            product_type: input.product_type,
            justification: ''
          })
        }).catch(() => {}) // fire and forget
      } catch (e) {}
    }

    return NextResponse.json({
      id: quotationId,
      input,
      cost_breakdown: costBreakdown,
      dt_before_vat: dtBeforeVat,
      margin,
      risk_level: riskLevel,
      ai_narrative: aiNarrative,
      trigger_questions: triggerQuestions,
      similar_orders: similarOrders,
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Auto-notify Zalo for RED/AMBER (appended)
// v2.1 Fri Sep 18 02:30:51 UTC 2026
export const dynamic = 'force-dynamic'
