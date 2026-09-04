import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TenantList from './TenantList'
import { getWIBDateString, calculateCheckoutDueDate } from '@/lib/dateUtils'

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
    .select('role, branch_id, full_name')
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
    .select('assigned_room_id, phone, email, full_name, rental_duration, rental_days, created_at, selected_room_type')
    .order('created_at', { ascending: false })

  let tenantsData = (rawTenantsData || []).map(t => {
    const cir = (checkInRequests || []).find(c => 
      c.assigned_room_id === t.room_id || 
      c.full_name?.toLowerCase().trim() === t.full_name?.toLowerCase().trim()
    )

    let cirDuration = cir?.rental_duration
    if (cir?.selected_room_type) {
      try {
        const parsed = typeof cir.selected_room_type === 'string' ? JSON.parse(cir.selected_room_type) : cir.selected_room_type
        if (parsed?.rental_duration) {
          cirDuration = parsed.rental_duration
        }
      } catch (e) {}
    }
    const effectiveDuration = (t.rental_duration && t.rental_duration !== 'daily') ? t.rental_duration : (cirDuration || t.rental_duration || 'daily')

    const checkInDate = t.check_in_date || (cir?.created_at ? getWIBDateString(cir.created_at) : null)
    let paymentDueDate = t.payment_due_date
    if (!paymentDueDate && checkInDate) {
      paymentDueDate = calculateCheckoutDueDate(
        cir?.created_at || checkInDate,
        effectiveDuration,
        cir?.rental_days || t.rental_count || 1,
        (cir as any)?.rental_weeks || 1,
        (cir as any)?.rental_months || 1
      )
    }

    const isTransition = Boolean(t.status === 'transition' || t.is_transition || t.rental_duration === 'transition')
    const isOta = Boolean(t.status === 'ota' || t.id_card_url?.startsWith('ota:') || t.id_card_url?.startsWith('ota-'))
    let otaPlatform = 'reddoorz'
    let otaBookingCode = ''
    if (isOta && t.id_card_url) {
      const parts = t.id_card_url.replace(/^ota[-:]/i, '').split(':')
      otaPlatform = parts[0] || 'reddoorz'
      otaBookingCode = parts[1] || ''
    }

    return {
      ...t,
      is_transition: isTransition,
      is_ota: isOta,
      ota_platform: otaPlatform,
      ota_booking_code: otaBookingCode,
      phone: t.phone || cir?.phone || '-',
      email: t.email || cir?.email || '-',
      check_in_date: checkInDate,
      payment_due_date: paymentDueDate,
      rental_duration: effectiveDuration,
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

          // Find exact staff and checkout settlement/claim payments for this guest
          const cNameLower = (c.full_name || '').toLowerCase().trim()
          
          // Look first for checkout-specific payments (pelunasan denda / klaim deposit)
          const checkoutPayment = (allPayments || []).find((p: any) => {
            const notesLower = (p.notes || '').toLowerCase()
            const isCheckoutNote = notesLower.includes('[pelunasan check-out]') || notesLower.includes('[klaim deposit]')
            return isCheckoutNote && cNameLower && notesLower.includes(cNameLower)
          })

          // Fallback to any payment specifically for this guest
          const matchedPayment = checkoutPayment || (allPayments || []).find((p: any) => {
            const notesLower = (p.notes || '').toLowerCase()
            return cNameLower && notesLower.includes(cNameLower)
          })

          let staffName = 'Staff Graha Aisyah'
          if (checkoutPayment?.confirmed_by && profileMap.has(checkoutPayment.confirmed_by)) {
            staffName = profileMap.get(checkoutPayment.confirmed_by)!
          } else if (c.assigned_by && profileMap.has(c.assigned_by)) {
            staffName = profileMap.get(c.assigned_by)!
          } else if (c.verified_by && profileMap.has(c.verified_by)) {
            staffName = profileMap.get(c.verified_by)!
          } else if (profile?.full_name) {
            staffName = profile.full_name
          }

          // Calculate actual due date based on check-in duration
          const dueDateStr = calculateCheckoutDueDate(
            c.created_at,
            c.rental_duration || 'daily',
            c.rental_days || 1,
            c.rental_weeks || 1,
            c.rental_months || 1
          )

          // Resolve actual checkout timestamp & time
          // If a checkout settlement payment exists, use its timestamp.
          // Otherwise, the guest checked out on-time at their due date (12:00 WIB).
          const checkoutTimestamp = checkoutPayment?.created_at || null
          const checkoutDateStr = checkoutTimestamp 
            ? getWIBDateString(checkoutTimestamp) 
            : (dueDateStr || getWIBDateString(c.updated_at || c.created_at))
          
          const checkoutTimeStr = checkoutTimestamp
            ? new Date(checkoutTimestamp).toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                timeZone: 'Asia/Jakarta' 
              })
            : '12:00'

          const isLateSettlement = checkoutPayment?.notes?.includes('[Pelunasan Check-Out]')
          const isDepositClaim = checkoutPayment?.notes?.includes('[Klaim Deposit]')
          const lateFeeAmount = isLateSettlement && checkoutPayment?.amount ? (parseFloat(checkoutPayment.amount) || 0) : 0
          const claimedDepositAmount = isDepositClaim && checkoutPayment?.amount ? (parseFloat(checkoutPayment.amount) || 0) : 0

          const initialDeposit = c.deposit_amount !== undefined && c.deposit_amount !== null ? parseFloat(c.deposit_amount) : 0
          const depositRefund = Math.max(0, initialDeposit - claimedDepositAmount)

          const rawNotes = c.payment_destination?.includes('[KTP') ? c.payment_destination : (checkoutPayment?.notes || c.payment_destination || 'Check-out selesai diproses')
          const isKtpHeld = rawNotes.includes('[KTP DITAHAN')
          let ktpUnpaidAmount = 0
          if (isKtpHeld) {
            const match = rawNotes.match(/TUNGGAKAN Rp\s*([\d\.,]+)/i)
            if (match) {
              ktpUnpaidAmount = parseFloat(match[1].replace(/\./g, '')) || 0
            }
          }

          const finalNotes = rawNotes
          const finalAdditionalPay = isKtpHeld ? (ktpUnpaidAmount || 150000) : lateFeeAmount

          return {
            id: c.id,
            tenant_name: c.full_name,
            phone: c.phone || null,
            room_number: room?.room_number || '-',
            floor_name: floor?.name || '-',
            room_type: room?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
            check_in_date: c.created_at ? getWIBDateString(c.created_at) : null,
            due_date: dueDateStr || null,
            checkout_date: checkoutDateStr,
            checkout_time: checkoutTimeStr,
            deposit_amount: initialDeposit,
            late_fee: isKtpHeld ? ktpUnpaidAmount : lateFeeAmount,
            damage_fee: 0,
            claimed_deposit: claimedDepositAmount,
            deposit_refund: depositRefund,
            additional_pay_needed: finalAdditionalPay,
            notes: finalNotes,
            processed_by: staffName,
            created_at: checkoutTimestamp || c.updated_at || c.created_at
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