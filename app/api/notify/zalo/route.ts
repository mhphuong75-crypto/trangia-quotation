import { NextRequest, NextResponse } from 'next/server'

const ZALO_ACCESS_TOKEN = process.env.ZALO_ACCESS_TOKEN || ''
const ZALO_CEO_UID = process.env.ZALO_CEO_UID || ''
const ZALO_CEO_UID_2 = process.env.ZALO_CEO_UID_2 || ''

async function sendZaloMessage(toUid: string, message: string) {
  if (!ZALO_ACCESS_TOKEN || !toUid) return { error: 'Missing config' }
  const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'access_token': ZALO_ACCESS_TOKEN },
    body: JSON.stringify({ recipient: { user_id: toUid }, message: { text: message } })
  })
  return res.json()
}

export async function POST(request: NextRequest) {
  try {
    const { quotation_id, customer_type, contract_value, margin_mid, risk_level, product_type, justification } = await request.json()
    if (risk_level !== 'RED' && risk_level !== 'AMBER') return NextResponse.json({ skipped: true })

    const emoji = risk_level === 'RED' ? '🔴' : '🟡'
    const valueM = Math.round(contract_value / 1e6)
    const marginPct = (margin_mid * 100).toFixed(1)
    const message = `${emoji} BÁO GIÁ ${risk_level} — CẦN PHÊ DUYỆT\n\n📋 Loại KH: ${customer_type}\n💰 Giá trị: ${valueM}M VND\n📊 Margin: ${marginPct}%\n🔧 ${product_type?.substring(0, 80)}${justification ? `\n\n📝 Giải trình: ${justification.substring(0, 150)}` : ''}\n\n👉 Duyệt tại:\nhttps://trangia-quotation-pmrawch76-trangiafurnitures.vercel.app/quote/${quotation_id}`

    const results = []
    if (ZALO_CEO_UID) results.push(await sendZaloMessage(ZALO_CEO_UID, message))
    if (ZALO_CEO_UID_2) results.push(await sendZaloMessage(ZALO_CEO_UID_2, message))
    return NextResponse.json({ sent: true, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
