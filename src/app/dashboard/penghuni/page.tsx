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
          // No-op for server components
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'staff'
  const isOwner = userRole === 'owner'

  // Fetch branches
  let branchesQuery = supabase.from('branches').select('id, name').order('name', { ascending: true })
  if (profile?.branch_id && !isOwner) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  const { data: branchesData } = await branchesQuery

  // Fetch floors
  let floorsQuery = supabase.from('floors').select('id, name, branch_id').order('name', { ascending: true })
  if (profile?.branch_id && !isOwner) {
    floorsQuery = floorsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: floorsData } = await floorsQuery

  // Fetch tenants with full room, floor, and branch relations
  const { data: rawTenantsData, error: tenantsError } = await supabase
    .from('tenants')
    .select('*, rooms(id, room_number, price, floor_id, floors(id, name, branch_id, branches(id, name)))')
    .order('check_in_date', { ascending: false })

  let tenantsData = rawTenantsData || []
  if (profile?.branch_id && !isOwner) {
    // If staff, filter tenants in staff's branch
    tenantsData = tenantsData.filter(t => t.rooms?.floors?.branch_id === profile.branch_id)
  }

  // Fetch available rooms
  let availableRoomsQuery = supabase.from('rooms').select('*, floors(id, name, branch_id, branches(id, name))').eq('is_occupied', false)
  if (profile?.branch_id && !isOwner) {
    availableRoomsQuery = availableRoomsQuery.eq('floors.branch_id', profile.branch_id)
  }
  const { data: availableRoomsData } = await availableRoomsQuery.order('room_number', { ascending: true })

  return (
    <TenantList 
      initialTenants={tenantsData || []} 
      initialAvailableRooms={availableRoomsData || []} 
      branches={branchesData || []}
      floors={floorsData || []}
      userRole={userRole}
    />
  )
}