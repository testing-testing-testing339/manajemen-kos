import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import QRGenerator from './QRGenerator'

export default async function QRGeneratorPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op
        },
      },
    }
  )

  // Get user profile to check role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  // Only owner and staff can access
  if (profile?.role !== 'owner' && profile?.role !== 'staff') {
    redirect('/dashboard')
  }

  // Get branches (Graha Aisyah Menteng)
  let branchesQuery = supabase
    .from('branches')
    .select('id, name, address, qr_code_url')
    .ilike('name', '%Menteng%')

  const { data: branches } = await branchesQuery.limit(1)

  return <QRGenerator branches={branches || []} userRole={profile?.role || null} />
}





