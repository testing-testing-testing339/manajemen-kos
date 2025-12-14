import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TenantList from './TenantList'

export default async function PenghuniPage() {
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

  // Get branches for filter (only for owner)
  let branchesQuery = supabase.from('branches').select('id, name').order('name', { ascending: true })
  if (profile?.role === 'staff' && profile.branch_id) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  const { data: branchesData } = await branchesQuery

  // Filter floors first (needed for filtering tenants and rooms)
  let floorsQuery = supabase.from('floors').select('id, name, branch_id, branches(name)').order('name', { ascending: true })
  if (profile?.role === 'staff' && profile.branch_id) {
    floorsQuery = floorsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: floorsData } = await floorsQuery

  // Filter tenants based on role
  let tenantsQuery = supabase.from('tenants').select('*, rooms(room_number, floor_id, floors(name, branch_id, branches(name)))')
  if (profile?.role === 'staff' && profile.branch_id && floorsData) {
    // Staff can only see tenants in their branch - filter by room's floor_id
    const floorIds = floorsData.map(f => f.id)
    if (floorIds.length > 0) {
      // Get rooms in those floors first
      const { data: staffRooms } = await supabase
        .from('rooms')
        .select('id')
        .in('floor_id', floorIds)
      
      if (staffRooms && staffRooms.length > 0) {
        const roomIds = staffRooms.map(r => r.id)
        tenantsQuery = tenantsQuery.in('room_id', roomIds)
      } else {
        // No rooms in their branch, return empty
        tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
      }
    } else {
      tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Filter available rooms based on role
  let availableRoomsQuery = supabase
    .from('rooms')
    .select('*, floors(name, branch_id, branches(name))')
    .eq('is_occupied', false)
  
  if (profile?.role === 'staff' && profile.branch_id && floorsData) {
    // Staff can only see rooms in their branch - filter by floor_id
    const floorIds = floorsData.map(f => f.id)
    if (floorIds.length > 0) {
      availableRoomsQuery = availableRoomsQuery.in('floor_id', floorIds)
    } else {
      availableRoomsQuery = availableRoomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: tenantsData, error: tenantsError } = await tenantsQuery
  const { data: availableRoomsData, error: roomsError } = await availableRoomsQuery

  if (tenantsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching tenants:', tenantsError)
  }
  if (roomsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching available rooms:', roomsError)
  }

  return (
    <TenantList 
      initialTenants={tenantsData || []} 
      initialAvailableRooms={availableRoomsData || []}
      userRole={profile?.role || null}
      branches={branchesData || []}
      floors={floorsData || []}
    />
  )
}