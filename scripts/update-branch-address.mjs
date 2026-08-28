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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const newAddress = 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'

async function updateAddress() {
  console.log('Updating branch address in Supabase database...')
  
  const { data, error } = await supabase
    .from('branches')
    .update({ address: newAddress })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select()

  if (error) {
    console.error('Error updating branches:', error.message)
  } else {
    console.log('Successfully updated branches in database:', data)
  }
}

updateAddress()
