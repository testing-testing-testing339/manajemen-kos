import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CheckoutHistoryList from './CheckoutHistoryList'
import { getWIBDateString } from '@/lib/dateUtils'

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

  // Fetch profiles for staff name mapping
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
  const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p.full_name || p.email]))

  // Fetch payments to link checkout settlement/claims to the exact confirming staff
  const { data: allPayments } = await supabase
    .from('payments')
    .select('id, amount, notes, confirmed_by, payment_method, created_at, tenant_id')
    .order('created_at', { ascending: false })

  // Fallback: Dynamically reconstruct checkout history from check_in_requests & active tenants
  if (checkoutHistoryList.length === 0) {
    try {
      // 1. Get all active tenants
      const { data: activeTenants } = await supabase
        .from('tenants')
        .select('id, full_name, room_id')

      const activeRoomIds = new Set((activeTenants || []).map((t: any) => t.room_id).filter(Boolean))
      const activeNames = new Set((activeTenants || []).map((t: any) => (t.full_name || '').toLowerCase().trim()))

      // 2. Get rooms with floors
      const { data: allRooms } = await supabase
        .from('rooms')
        .select('id, room_number, room_type, floors(name)')

      const roomMap = new Map((allRooms || []).map((r: any) => [r.id, r]))

      // 3. Get completed & checked_out check-ins
      const { data: completedCIR } = await supabase
        .from('check_in_requests')
        .select('*')
        .in('status', ['completed', 'checked_out'])
        .order('updated_at', { ascending: false })

      if (completedCIR && completedCIR.length > 0) {
        // Filter those who are no longer active tenants
        const checkedOutItems = completedCIR.filter((c: any) => {
          const isRoomActive = c.assigned_room_id && activeRoomIds.has(c.assigned_room_id)
          const isNameActive = activeNames.has((c.full_name || '').toLowerCase().trim())
          return !isRoomActive || !isNameActive
        })

        checkoutHistoryList = checkedOutItems.map((c: any) => {
          const room = roomMap.get(c.assigned_room_id) as any
          const floor = room?.floors || {}

          // Find exact staff who confirmed payment or assigned room
          const cNameLower = (c.full_name || '').toLowerCase()
          const matchedPayment = (allPayments || []).find((p: any) => {
            const notesLower = (p.notes || '').toLowerCase()
            return notesLower.includes(cNameLower) || (room?.room_number && notesLower.includes(`kamar: ${room.room_number}`))
          })

          let staffName = 'Staff Graha Aisyah'
          if (matchedPayment?.confirmed_by && profileMap.has(matchedPayment.confirmed_by)) {
            staffName = profileMap.get(matchedPayment.confirmed_by)!
          } else if (c.assigned_by && profileMap.has(c.assigned_by)) {
            staffName = profileMap.get(c.assigned_by)!
          } else if (c.verified_by && profileMap.has(c.verified_by)) {
            staffName = profileMap.get(c.verified_by)!
          } else if (profile?.full_name) {
            staffName = profile.full_name
          }

          // Resolve actual checkout timestamp & time
          const checkoutTimestamp = matchedPayment?.created_at || c.updated_at || c.created_at
          const checkoutDateObj = new Date(checkoutTimestamp)
          const checkoutTimeStr = checkoutDateObj.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: 'Asia/Jakarta' 
          })

          const isLateSettlement = matchedPayment?.notes?.includes('[Pelunasan Check-Out]')
          const isDepositClaim = matchedPayment?.notes?.includes('[Klaim Deposit]')
          const lateFeeAmount = isLateSettlement && matchedPayment?.amount ? (parseFloat(matchedPayment.amount) || 0) : 0
          const claimedDepositAmount = isDepositClaim && matchedPayment?.amount ? (parseFloat(matchedPayment.amount) || 0) : 0

          const initialDeposit = c.deposit_amount !== undefined && c.deposit_amount !== null ? parseFloat(c.deposit_amount) : 0
          const depositRefund = Math.max(0, initialDeposit - claimedDepositAmount)

          const isKtpHeld = c.notes?.includes('[KTP DITAHAN')
          let ktpUnpaidAmount = 0
          if (isKtpHeld && c.notes) {
            const match = c.notes.match(/TUNGGAKAN Rp\s*([\d\.,]+)/i)
            if (match) {
              ktpUnpaidAmount = parseFloat(match[1].replace(/\./g, '')) || 0
            }
          }

          const finalNotes = c.notes || matchedPayment?.notes || 'Check-out selesai diproses'
          const finalAdditionalPay = isKtpHeld ? (ktpUnpaidAmount || 50000) : lateFeeAmount

          return {
            id: c.id,
            tenant_name: c.full_name,
            phone: c.phone || null,
            room_number: room?.room_number || '-',
            floor_name: floor?.name || '-',
            room_type: room?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
            check_in_date: c.created_at ? getWIBDateString(c.created_at) : null,
            due_date: null,
            checkout_date: checkoutTimestamp ? getWIBDateString(checkoutTimestamp) : getWIBDateString(),
            checkout_time: checkoutTimeStr,
            deposit_amount: initialDeposit,
            late_fee: isKtpHeld ? ktpUnpaidAmount : lateFeeAmount,
            damage_fee: 0,
            claimed_deposit: claimedDepositAmount,
            deposit_refund: depositRefund,
            additional_pay_needed: finalAdditionalPay,
            notes: finalNotes,
            processed_by: staffName,
            created_at: checkoutTimestamp
          }
        })
      }
    } catch (fallbackErr) {
      console.warn('Fallback dynamic checkout reconstruction error:', fallbackErr)
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
