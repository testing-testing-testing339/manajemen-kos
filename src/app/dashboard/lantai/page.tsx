import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import FloorList from './FloorList'

export default async function LantaiPage() {
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

  // Filter floors based on role
  let floorsQuery = supabase.from('floors').select('*, branches(name)')
  if (profile?.role === 'staff' && profile.branch_id) {
    // Staff can only see floors in their branch
    floorsQuery = floorsQuery.eq('branch_id', profile.branch_id)
  }

  // Filter branches for dropdown
  let branchesQuery = supabase.from('branches').select('*')
  if (profile?.role === 'staff' && profile.branch_id) {
    // Staff can only see their own branch
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }

  const { data: floorsData, error: floorsError } = await floorsQuery
  const { data: branchesData, error: branchesError } = await branchesQuery.order('name', { ascending: true })

  if (floorsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching floors:', floorsError)
  }
  if (branchesError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching branches:', branchesError)
  }

  return <FloorList initialFloors={floorsData || []} initialBranches={branchesData || []} userRole={profile?.role || null} />
}