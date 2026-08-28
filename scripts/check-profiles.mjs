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

async function check() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  console.log('Auth Users:', users?.users.map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })))

  const { data: profiles, error: profError } = await supabase.from('profiles').select('*')
  console.log('Profiles table:', profiles)
}

check()
