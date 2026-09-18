import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, justification } = await request.json()
    const { data, error } = await supabaseAdmin
      .from('quotations')
      .update({ ai_narrative: (await supabaseAdmin.from('quotations').select('ai_narrative').eq('id', id).single()).data?.ai_narrative + `\n\n---\n📝 Giải trình GĐ tính giá:\n${justification}` })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
