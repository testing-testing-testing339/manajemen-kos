import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TenantList from './TenantList'
import { getWIBDateString } from '@/lib/dateUtils'

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

  // Fetch check-in requests to get phone number if tenant.phone is empty
  const { data: checkInRequests } = await supabase
    .from('check_in_requests')
    .select('assigned_room_id, phone, email, full_name, rental_duration, rental_days, created_at')
    .order('created_at', { ascending: false })

  let tenantsData = (rawTenantsData || []).map(t => {
    const cir = (checkInRequests || []).find(c => 
      c.assigned_room_id === t.room_id || 
      c.full_name?.toLowerCase().trim() === t.full_name?.toLowerCase().trim()
    )

    const checkInDate = t.check_in_date || (cir?.created_at ? getWIBDateString(cir.created_at) : null)
    let paymentDueDate = t.payment_due_date
    if (!paymentDueDate && checkInDate) {
      const d = new Date(checkInDate)
      d.setDate(d.getDate() + (cir?.rental_days || 1))
      paymentDueDate = getWIBDateString(d)
    }

    return {
      ...t,
      phone: t.phone || cir?.phone || '-',
      email: t.email || cir?.email || '-',
      check_in_date: checkInDate,
      payment_due_date: paymentDueDate,
      rental_duration: t.rental_duration || cir?.rental_duration || 'daily',
      rental_count: t.rental_count || cir?.rental_days || 1,
      deposit_amount: t.deposit_amount !== undefined && t.deposit_amount !== null ? t.deposit_amount : 0
    }
  })

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

  // Fetch checkout history from checkout_history table
  let checkoutHistoryList: any[] = []
  try {
    const { data: historyData, error: historyError } = await supabase
      .from('checkout_history')
      .select('*')
      .order('created_at', { ascending: false })

    if (!historyError && historyData && historyData.length > 0) {
      checkoutHistoryList = historyData
    }
  } catch (err) {
    console.warn('checkout_history fetch in penghuni page:', err)
  }

  // Fallback: Dynamically reconstruct checkout history from check_in_requests & active tenants
  if (checkoutHistoryList.length === 0) {
    try {
      const activeRoomIds = new Set((rawTenantsData || []).map((t: any) => t.room_id).filter(Boolean))
      const activeNames = new Set((rawTenantsData || []).map((t: any) => (t.full_name || '').toLowerCase().trim()))

      const { data: allRooms } = await supabase
        .from('rooms')
        .select('id, room_number, room_type, floors(name)')

      const roomMap = new Map((allRooms || []).map((r: any) => [r.id, r]))

      const { data: completedCIR } = await supabase
        .from('check_in_requests')
        .select('*')
        .in('status', ['completed', 'checked_out'])
        .order('updated_at', { ascending: false })

      if (completedCIR && completedCIR.length > 0) {
        const checkedOutItems = completedCIR.filter((c: any) => {
          const isRoomActive = c.assigned_room_id && activeRoomIds.has(c.assigned_room_id)
          const isNameActive = activeNames.has((c.full_name || '').toLowerCase().trim())
          return !isRoomActive || !isNameActive
        })

        checkoutHistoryList = checkedOutItems.map((c: any) => {
          const room = roomMap.get(c.assigned_room_id) as any
          const floor = room?.floors || {}
          return {
            id: c.id,
            tenant_name: c.full_name,
            phone: c.phone || null,
            room_number: room?.room_number || '-',
            floor_name: floor?.name || '-',
            room_type: room?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
            check_in_date: c.created_at ? getWIBDateString(c.created_at) : null,
            due_date: null,
            checkout_date: c.updated_at ? getWIBDateString(c.updated_at) : getWIBDateString(),
            checkout_time: '12:00',
            deposit_amount: c.deposit_amount !== undefined && c.deposit_amount !== null ? parseFloat(c.deposit_amount) : 0,
            late_fee: 0,
            damage_fee: 0,
            claimed_deposit: 0,
            deposit_refund: c.deposit_amount !== undefined && c.deposit_amount !== null ? parseFloat(c.deposit_amount) : 0,
            additional_pay_needed: 0,
            notes: 'Check-out selesai diproses',
            processed_by: 'Resepsionis',
            created_at: c.updated_at || c.created_at
          }
        })
      }
    } catch (fallbackErr) {
      console.warn('Fallback dynamic checkout in penghuni error:', fallbackErr)
    }
  }

  return (
    <TenantList 
      initialTenants={tenantsData || []} 
      initialAvailableRooms={availableRoomsData || []} 
      initialCheckoutHistory={checkoutHistoryList || []}
      branches={branchesData || []}
      floors={floorsData || []}
      userRole={userRole}
    />
  )
}