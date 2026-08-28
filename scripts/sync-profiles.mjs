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

async function syncAllProfiles() {
  const { data: usersData } = await supabase.auth.admin.listUsers()
  const { data: branch } = await supabase.from('branches').select('id').limit(1).single()
  const branchId = branch?.id

  for (const u of (usersData?.users || [])) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', u.id).single()
    if (!existing) {
      console.log('Creating missing profile for:', u.email)
      await supabase.from('profiles').insert({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Admin',
        role: u.user_metadata?.role || 'owner',
        branch_id: branchId,
        is_active: true
      })
    }
  }

  const { data: allProfiles } = await supabase.from('profiles').select('*')
  console.log('All Synced Profiles:', allProfiles)
}

syncAllProfiles()
