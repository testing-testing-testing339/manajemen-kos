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

  // Fetch tenants for search functionality (to search by tenant name)
  // Fetch tenants with full data
  let tenantsQuery = supabase
    .from('tenants')
    .select('*')
  
  if (profile?.role === 'staff' && profile.branch_id && floorsForRoomsData) {
    const floorIds = floorsForRoomsData.map(f => f.id)
    if (floorIds.length > 0) {
      const { data: staffRooms } = await supabase
        .from('rooms')
        .select('id')
        .in('floor_id', floorIds)
      
      if (staffRooms && staffRooms.length > 0) {
        const roomIds = staffRooms.map(r => r.id)
        tenantsQuery = tenantsQuery.in('room_id', roomIds)
      } else {
        tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
      }
    } else {
      tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
    }
  }
  
  const { data: rawTenants } = await tenantsQuery

  // Fetch check-in requests to get phone number and details
  const { data: checkInRequests } = await supabase
    .from('check_in_requests')
    .select('assigned_room_id, phone, email, full_name, rental_duration, rental_days, created_at')
    .order('created_at', { ascending: false })

  const tenantsData = (rawTenants || []).map(t => {
    const cir = (checkInRequests || []).find(c => 
      c.assigned_room_id === t.room_id || 
      c.full_name?.toLowerCase().trim() === t.full_name?.toLowerCase().trim()
    )

    const checkInDate = t.check_in_date || (cir?.created_at ? new Date(cir.created_at).toISOString().split('T')[0] : null)
    let paymentDueDate = t.payment_due_date
    if (!paymentDueDate && checkInDate) {
      const d = new Date(checkInDate)
      d.setDate(d.getDate() + (cir?.rental_days || 1))
      paymentDueDate = d.toISOString().split('T')[0]
    }

    return {
      ...t,
      phone: t.phone || cir?.phone || '-',
      email: t.email || cir?.email || '-',
      check_in_date: checkInDate,
      payment_due_date: paymentDueDate,
      rental_duration: t.rental_duration || cir?.rental_duration || 'daily',
      rental_count: t.rental_count || cir?.rental_days || 1,
      deposit_amount: t.deposit_amount || 100000
    }
  })

  return (
    <PropertiList
      initialBranches={branchesData || []}
      initialFloors={floorsData || []}
      initialRooms={roomsData || []}
      initialFloorsForRooms={floorsForRoomsData || []}
      initialTenants={tenantsData}
      userRole={profile?.role || null}
    />
  )
}


