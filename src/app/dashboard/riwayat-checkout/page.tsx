import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CheckoutHistoryList from './CheckoutHistoryList'

export const dynamic = 'force-dynamic'

export default async function RiwayatCheckoutPage() {
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
    .select('role, branch_id, full_name')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'staff'

  // Fetch branches for filter
  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .order('name', { ascending: true })

  // Fetch floors for filter
  const { data: floorsData } = await supabase
    .from('floors')
    .select('id, name, branch_id')
    .order('name', { ascending: true })

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
    console.warn('checkout_history table fetch:', err)
  }

  // Fallback: If checkout_history is empty, also load from checked_out check_in_requests
  if (checkoutHistoryList.length === 0) {
    try {
      const { data: checkedOutCIR } = await supabase
        .from('check_in_requests')
        .select('id, full_name, phone, created_at, updated_at, duration_months, total_amount, assigned_room_id, rooms(room_number, room_type, floors(name))')
        .eq('status', 'checked_out')
        .order('updated_at', { ascending: false })

      if (checkedOutCIR && checkedOutCIR.length > 0) {
        checkoutHistoryList = checkedOutCIR.map((c: any) => {
          const room = c.rooms || {}
          const floor = room.floors || {}
          return {
            id: c.id,
            tenant_name: c.full_name,
            phone: c.phone || null,
            room_number: room.room_number || '-',
            floor_name: floor.name || '-',
            room_type: room.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
            check_in_date: c.created_at ? c.created_at.split('T')[0] : null,
            due_date: null,
            checkout_date: c.updated_at ? c.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
            checkout_time: '12:00',
            deposit_amount: 100000,
            late_fee: 0,
            damage_fee: 0,
            claimed_deposit: 0,
            deposit_refund: 100000,
            additional_pay_needed: 0,
            notes: 'Check-out berhasil diproses',
            processed_by: 'Resepsionis',
            created_at: c.updated_at || c.created_at
          }
        })
      }
    } catch (fallbackErr) {
      console.warn('Fallback checked_out check_in_requests fetch error:', fallbackErr)
    }
  }

  // Also fetch payments related to deposit claims as supplementary data
  const { data: claimPayments } = await supabase
    .from('payments')
    .select('*')
    .like('notes', '%[Klaim Deposit]%')
    .order('payment_date', { ascending: false })

  return (
    <CheckoutHistoryList
      initialHistory={checkoutHistoryList}
      claimPayments={claimPayments || []}
      branches={branchesData || []}
      floors={floorsData || []}
      userRole={userRole}
    />
  )
}
