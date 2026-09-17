import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, action, approved_by, reason } = await request.json()
    
    const update = action === 'approve' 
      ? { approved_by, approved_at: new Date().toISOString() }
      : { rejected_by: approved_by, rejected_at: new Date().toISOString(), rejection_reason: reason }
    
    const { data, error } = await supabaseAdmin
      .from('quotations')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
