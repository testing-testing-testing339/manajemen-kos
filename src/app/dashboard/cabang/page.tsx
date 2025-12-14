import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BranchList from './BranchList'

export default async function CabangPage() {
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
          // No-op for server components - they cannot modify cookies
        },
      },
    }
  )

  // Get user profile to check role and branch
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  // Filter branches based on role
  let branchesQuery = supabase.from('branches').select('*')
  if (profile?.role === 'staff' && profile.branch_id) {
    // Staff can only see their own branch
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  // Owner can see all branches

  const { data, error } = await branchesQuery.order('name', { ascending: true })

  if (error && process.env.NODE_ENV === 'development') {
    console.error('Error fetching branches:', error)
  }

  return <BranchList initialBranches={data || []} userRole={profile?.role || null} />
}