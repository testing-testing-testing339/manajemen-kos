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

const targetId = '4a28cc04-c94e-47ea-b0a7-7d40ff7b4902' // admin@grahamenteng.com

async function deleteStaffSafely() {
  console.log(`Unlinking references for staff ID: ${targetId}...`)

  // 1. Unlink check_in_requests
  try {
    await supabase.from('check_in_requests').update({ assigned_by: null }).eq('assigned_by', targetId)
  } catch (e) {}

  // 2. Unlink payments
  try {
    await supabase.from('payments').update({ confirmed_by: null }).eq('confirmed_by', targetId)
  } catch (e) {}

  // 3. Delete from profiles
  const { error: profError } = await supabase.from('profiles').delete().eq('id', targetId)
  if (profError) {
    console.error('Error deleting profile:', profError.message)
  } else {
    console.log('Successfully deleted staff from profiles table')
  }

  // 4. Delete from auth.users
  const { error: authError } = await supabase.auth.admin.deleteUser(targetId)
  if (authError) {
    console.error('Error deleting auth user:', authError.message)
  } else {
    console.log('Successfully deleted staff from auth.users')
  }

  // Check remaining
  const { data: remainingUsers } = await supabase.auth.admin.listUsers()
  console.log('Remaining Auth Users:', remainingUsers?.users.map(u => ({ email: u.email, id: u.id })))
}

deleteStaffSafely()
