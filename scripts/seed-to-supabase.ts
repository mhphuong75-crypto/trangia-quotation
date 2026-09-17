import { createClient } from '@supabase/supabase-js'
import { HISTORICAL_ORDERS } from '../lib/seed-orders'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log(`Seeding ${HISTORICAL_ORDERS.length} orders...`)
  
  const { data, error } = await supabase
    .from('orders')
    .upsert(HISTORICAL_ORDERS, { onConflict: 'ma' })
  
  if (error) {
    console.error('Error:', error.message)
    return
  }
  
  console.log('✅ Seeded successfully')
}

seed()
