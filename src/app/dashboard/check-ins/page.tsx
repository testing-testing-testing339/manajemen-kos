import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CheckInManager from './CheckInManager'

export default async function CheckInsPage() {
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

  // Filter check-in requests based on role
  let checkInsQuery = supabase
    .from('check_in_requests')
    .select('*, branches(name), rooms:assigned_room_id(room_number, floors(branches(name))), profiles:assigned_by(full_name)')
    .order('created_at', { ascending: false })

  if (profile?.role === 'staff' && profile.branch_id) {
    // Staff can only see check-ins in their branch
    checkInsQuery = checkInsQuery.eq('branch_id', profile.branch_id)
  }
  // Owner can see all

  const { data: checkInsData, error: checkInsError } = await checkInsQuery

  // Get available rooms for assignment
  let roomsQuery = supabase
    .from('rooms')
    .select('id, room_number, price, is_occupied, floors(name, branch_id, branches(name))')
    .eq('is_occupied', false)

  if (profile?.role === 'staff' && profile.branch_id) {
    // Get floors in staff's branch first
    const { data: floors } = await supabase
      .from('floors')
      .select('id')
      .eq('branch_id', profile.branch_id)
    
    if (floors && floors.length > 0) {
      const floorIds = floors.map(f => f.id)
      roomsQuery = roomsQuery.in('floor_id', floorIds)
    } else {
      roomsQuery = roomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: availableRooms, error: roomsError } = await roomsQuery.order('room_number', { ascending: true })

  // Get branches for QR generator
  let branchesQuery = supabase.from('branches').select('id, name, address, qr_code_url')
  if (profile?.role === 'staff' && profile.branch_id) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  const { data: branches } = await branchesQuery.order('name', { ascending: true })

  if (checkInsError && process.env.NODE_ENV === 'development') {
    console.error('Error fetching check-ins:', checkInsError)
  }

  return (
    <CheckInManager 
      initialCheckIns={checkInsData || []} 
      availableRooms={availableRooms || []}
      branches={branches || []}
      userRole={profile?.role || null}
      userBranchId={profile?.branch_id || null}
    />
  )
}

