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

const targetEmail = 'farhan@griyamenteng.com'

async function deleteAccount() {
  console.log(`Deleting account: ${targetEmail}...`)

  // 1. Find user in auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
  const user = usersData?.users.find(u => u.email === targetEmail)

  if (!user) {
    console.log(`User ${targetEmail} not found in auth.users`)
  } else {
    // Delete from profiles
    const { error: profError } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profError) {
      console.error('Error deleting profile:', profError.message)
    } else {
      console.log('Successfully deleted from profiles table')
    }

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error('Error deleting from auth.users:', authError.message)
    } else {
      console.log(`Successfully deleted auth user: ${user.id} (${targetEmail})`)
    }
  }

  // Check remaining accounts
  const { data: remainingUsers } = await supabase.auth.admin.listUsers()
  console.log('Remaining Auth Users:', remainingUsers?.users.map(u => ({ email: u.email, id: u.id })))
}

deleteAccount()
