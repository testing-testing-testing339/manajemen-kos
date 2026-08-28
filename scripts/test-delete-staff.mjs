import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    value = value.trim().replace(/^['"]|['"]$/g, '')
    env[match[1]] = value
  }
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const targetId = '4a28cc04-c94e-47ea-b0a7-7d40ff7b4902'

async function testDelete() {
  // Check if payments refer to this staff
  const { data: payments } = await supabase.from('payments').select('id, confirmed_by, notes').eq('confirmed_by', targetId)
  console.log('Payments referencing this staff:', payments)

  // Check if check_in_requests refer to this staff
  const { data: checkins } = await supabase.from('check_in_requests').select('id, reviewed_by, full_name').eq('reviewed_by', targetId)
  console.log('Check-in requests referencing this staff:', checkins)

  // Check if tenants refer to this staff
  const { data: tenants } = await supabase.from('tenants').select('id, full_name').eq('created_by', targetId)
  console.log('Tenants referencing this staff:', tenants)

  // Attempt delete from profiles
  const { error: delError } = await supabase.from('profiles').delete().eq('id', targetId)
  if (delError) {
    console.error('Delete Error from profiles:', delError)
  } else {
    console.log('Deleted successfully from profiles')
  }
}

testDelete()
