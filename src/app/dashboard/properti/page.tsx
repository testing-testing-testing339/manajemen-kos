import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PropertiList from './PropertiList'

export default async function PropertiPage() {
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

  // Fetch branches
  let branchesQuery = supabase.from('branches').select('*')
  if (profile?.role === 'staff' && profile.branch_id) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  const { data: branchesData } = await branchesQuery.order('name', { ascending: true })

  // Fetch floors
  let floorsQuery = supabase.from('floors').select('*, branches(name)')
  if (profile?.role === 'staff' && profile.branch_id) {
    floorsQuery = floorsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: floorsData } = await floorsQuery

  // Fetch floors for rooms query
  let floorsForRoomsQuery = supabase.from('floors').select('id, name, branch_id, branches(name)')
  if (profile?.role === 'staff' && profile.branch_id) {
    floorsForRoomsQuery = floorsForRoomsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: floorsForRoomsData } = await floorsForRoomsQuery

  // Fetch rooms
  let roomsQuery = supabase.from('rooms').select('*, floors(name, branch_id, branches(name))')
  if (profile?.role === 'staff' && profile.branch_id && floorsForRoomsData) {
    const floorIds = floorsForRoomsData.map(f => f.id)
    if (floorIds.length > 0) {
      roomsQuery = roomsQuery.in('floor_id', floorIds)
    } else {
      roomsQuery = roomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
    }
  }
  const { data: roomsData } = await roomsQuery

  return (
    <PropertiList
      initialBranches={branchesData || []}
      initialFloors={floorsData || []}
      initialRooms={roomsData || []}
      initialFloorsForRooms={floorsForRoomsData || []}
      userRole={profile?.role || null}
    />
  )
}

