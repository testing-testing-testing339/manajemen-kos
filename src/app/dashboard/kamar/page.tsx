import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RoomList from './RoomList'

export default async function KamarPage() {
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

  // Filter floors first (needed for filtering rooms)
  let floorsQuery = supabase.from('floors').select('id, name, branch_id, branches(name)')
  if (profile?.role === 'staff' && profile.branch_id) {
    floorsQuery = floorsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: floorsData, error: floorsError } = await floorsQuery

  // Filter rooms based on role
  let roomsQuery = supabase.from('rooms').select('*, floors(name, branch_id, branches(name))')
  if (profile?.role === 'staff' && profile.branch_id && floorsData) {
    // Staff can only see rooms in their branch - filter by floor_id
    const floorIds = floorsData.map(f => f.id)
    if (floorIds.length > 0) {
      roomsQuery = roomsQuery.in('floor_id', floorIds)
    } else {
      // No floors in their branch, return empty by using non-existent ID
      roomsQuery = roomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Filter branches for dropdown (only needed for owner)
  let branchesQuery = supabase.from('branches').select('*')
  if (profile?.role === 'staff' && profile.branch_id) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }

  const { data: roomsData, error: roomsError } = await roomsQuery
  const { data: branchesData, error: branchesError } = await branchesQuery.order('name', { ascending: true })

  if (roomsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching rooms:', roomsError)
  }
  if (floorsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching floors:', floorsError)
  }
  if (branchesError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching branches:', branchesError)
  }

  return <RoomList initialRooms={roomsData || []} initialFloors={floorsData || []} initialBranches={branchesData || []} userRole={profile?.role || null} />
}