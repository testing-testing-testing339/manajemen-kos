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

async function setPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById('c92a5d5f-42b6-4f1e-ad63-f527c489b6bc', {
    password: 'password123'
  })
  if (error) console.error('Error setting password:', error)
  else console.log('Password updated successfully for admin@graha.com')
}

setPassword()
