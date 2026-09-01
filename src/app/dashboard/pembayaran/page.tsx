import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PaymentList from './PaymentList'

export default async function PembayaranPage() {
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

  // Get user profile to check role and branch
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  let userRole: string | null = null
  let userBranchId: string | null = null
  let userFullName: string | null = null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id, full_name')
    .eq('id', user.id)
    .single()
    
  if (profile) {
    userRole = profile.role || null
    userBranchId = profile.branch_id || null
    userFullName = profile.full_name || null
  }

  // OPTIMIZATION: Get branch metadata once and reuse (floors, rooms, tenant IDs)
  let branchFloors: any[] = []
  let branchRoomIds: string[] = []
  let branchTenantIds: Set<string> = new Set()
  
  if (userRole === 'staff' && userBranchId) {
    // Get floors in this branch once
    const { data: floors } = await supabase
      .from('floors')
      .select('id')
      .eq('branch_id', userBranchId)
    
    if (floors && floors.length > 0) {
      branchFloors = floors
      const floorIds = floors.map((f: any) => f.id)
      
      // Get rooms in these floors once
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .in('floor_id', floorIds)
      
      if (rooms && rooms.length > 0) {
        branchRoomIds = rooms.map((r: any) => r.id)
        
        // Get tenant IDs in these rooms once
        const { data: branchTenants } = await supabase
          .from('tenants')
          .select('id')
          .in('room_id', branchRoomIds)
        
        if (branchTenants) {
          branchTenantIds = new Set(branchTenants.map((t: any) => t.id))
        }
      }
    }
  }

  // OPTIMIZATION: Parallelize independent queries - tenants and payments can be fetched in parallel
  let tenantsQuery = supabase
    .from('tenants')
    .select('*, rooms(room_number, price, floors(branches(name)))')
    .order('payment_due_date', { ascending: true })
  
  if (userRole === 'staff' && branchRoomIds.length > 0) {
    tenantsQuery = tenantsQuery.in('room_id', branchRoomIds)
  } else if (userRole === 'staff') {
    tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
  }
  
  // Execute tenants and payments queries in parallel
  const [tenantsResult, paymentsResult] = await Promise.all([
    tenantsQuery,
    supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
  ])
  
  const { data: tenantsData, error: tenantsError } = tenantsResult

  // Process check-in requests for tenants
  let tenantsWithCheckIn: any[] = []
  if (tenantsData && tenantsData.length > 0) {
    const roomIds = tenantsData.map(t => t.room_id).filter(Boolean)
    if (roomIds.length > 0) {
      let checkInQueryForTenants = supabase
        .from('check_in_requests')
        .select('id, assigned_room_id, total_amount, rental_duration, rental_days, rental_weeks, rental_months, selected_room_type')
        .in('assigned_room_id', roomIds)
        .eq('status', 'completed')
      
      if (userRole === 'staff' && userBranchId) {
        checkInQueryForTenants = checkInQueryForTenants.eq('branch_id', userBranchId)
      }
      
      const { data: checkInRequests } = await checkInQueryForTenants
      
      // Create map: room_id -> check_in_request
      const roomToCheckInMap = new Map()
      if (checkInRequests) {
        checkInRequests.forEach((cir: any) => {
          if (cir.assigned_room_id) {
            roomToCheckInMap.set(cir.assigned_room_id, cir)
          }
        })
      }
      
      // Merge check_in_requests with tenants
      tenantsWithCheckIn = tenantsData.map(tenant => {
        const checkInRequest = roomToCheckInMap.get(tenant.room_id)
        return {
          ...tenant,
          check_in_request: checkInRequest || null
        }
      })
    } else {
      tenantsWithCheckIn = tenantsData
    }
  } else {
    tenantsWithCheckIn = tenantsData || []
  }

  // Process payments
  let paymentsData = []
  let paymentsError = null
  try {
    const { data: allPaymentsData, error: paymentsResultError } = paymentsResult || {}
    
    if (paymentsResultError) {
      paymentsData = []
      paymentsError = paymentsResultError
    } else {
      let allPayments = allPaymentsData || []
      
      // Filter payments by branch if user is staff (using cached branchTenantIds)
      if (userRole === 'staff' && branchTenantIds.size > 0) {
        allPayments = allPayments.filter((p: any) => 
          !p.tenant_id || branchTenantIds.has(p.tenant_id)
        )
      } else if (userRole === 'staff') {
        // No tenants in branch, only keep payments without tenant_id
        allPayments = allPayments.filter((p: any) => !p.tenant_id)
      }
      
      paymentsData = allPayments
      
      // For payments with tenant_id, get tenant info
      const paymentsWithTenantId = paymentsData.filter((p: any) => p.tenant_id)
      
      if (paymentsWithTenantId.length > 0) {
        const tenantIds = paymentsWithTenantId.map((p: any) => p.tenant_id)
        let tenantsQuery = supabase
          .from('tenants')
          .select('id, full_name, rental_duration, rental_count, check_in_date, payment_due_date, rooms(room_number, floors(branches(name)))')
          .in('id', tenantIds)
        
        // Additional filtering for staff using cached data
        if (userRole === 'staff' && branchRoomIds.length > 0) {
          tenantsQuery = tenantsQuery.in('room_id', branchRoomIds)
        }
        
        const { data: tenantsForPayments } = await tenantsQuery
        
        // Enrich payments with tenant data
        if (tenantsForPayments) {
          const tenantMap = new Map(tenantsForPayments.map((t: any) => [t.id, t]))
          paymentsData = paymentsData.map((payment: any) => {
            if (payment.tenant_id) {
              const tenant = tenantMap.get(payment.tenant_id)
              if (tenant) {
                return { ...payment, tenants: tenant }
              }
            }
            return payment
          })
        }
      }
      
      // OPTIMIZATION: Fetch confirmed_by profiles and check-in requests in parallel
      const paymentsWithConfirmedBy = paymentsData.filter((p: any) => p.confirmed_by)
      const confirmedByIds = [...new Set(paymentsWithConfirmedBy.map((p: any) => p.confirmed_by).filter(Boolean))]
      
      let checkInRequestsQuery = supabase
        .from('check_in_requests')
        .select('id, full_name, phone, payment_proof_url, id_card_photo_url, selfie_photo_url, total_amount, deposit_amount, payment_method, payment_destination, assigned_room_id, assigned_at, created_at, id_card_number, rental_duration, rental_days, rental_weeks, rental_months, selected_room_type, rooms(room_number, floors(branches(name)))')
        .order('created_at', { ascending: false })
      
      if (userRole === 'staff' && userBranchId) {
        checkInRequestsQuery = checkInRequestsQuery.eq('branch_id', userBranchId)
      }
      
      // Execute in parallel
      const [profilesResult, checkInRequestsResult] = await Promise.all([
        // Fetch profiles for confirmed_by
        (async () => {
          if (confirmedByIds.length === 0) {
            return { data: [], error: null }
          }
          
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceRoleKey) {
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceRoleKey,
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
            )
            return supabaseAdmin
              .from('profiles')
              .select('id, full_name')
              .in('id', confirmedByIds)
          } else {
            return supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', confirmedByIds)
          }
        })(),
        
        // Fetch check-in requests
        checkInRequestsQuery
      ])
      
      const { data: profiles, error: profilesError } = profilesResult
      const { data: checkInRequests, error: checkInRequestsError } = checkInRequestsResult
      
      // Map profiles to payments
      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
        paymentsData = paymentsData.map((payment: any) => {
          if (payment.confirmed_by) {
            const profile = profileMap.get(payment.confirmed_by)
            if (profile) {
              return { ...payment, profiles: profile }
            }
          }
          return payment
        })
      }
      
      // Process check-in requests and notes metadata for payments
      const enrichedPayments: any[] = []
      const usedCheckInIds = new Set<string>()

      paymentsData.forEach((payment: any) => {
        let tenant = payment.tenants
        const isCheckoutPenaltyOrClaim = payment.payment_method === 'deposit_deduction' || 
          payment.notes?.includes('[Klaim Deposit]') || 
          payment.notes?.includes('[Pelunasan Check-Out]') ||
          payment.notes?.includes('Denda') ||
          payment.notes?.includes('Kerusakan')

        // Extract tenant name and room from notes if not present
        let extractedName: string | null = null
        let extractedRoom: string | null = null
        if (payment.notes) {
          const nameMatch = payment.notes.match(/Tamu:\s*([^|]+)/i)
          if (nameMatch) extractedName = nameMatch[1].trim()
          const roomMatch = payment.notes.match(/Kamar:\s*([^|]+)/i)
          if (roomMatch) extractedRoom = roomMatch[1].trim()
        }

        let matchedCheckIn: any = null

        // Try match check-in request if available
        if (checkInRequests && checkInRequests.length > 0) {
          // 1. Try match by tenant's room_id or tenant's full_name
          if (tenant) {
            matchedCheckIn = checkInRequests.find((cir: any) => 
              (!usedCheckInIds.has(cir.id)) && (
                (cir.assigned_room_id && tenant.rooms && cir.assigned_room_id === tenant.room_id) ||
                (cir.full_name && tenant.full_name && cir.full_name.toLowerCase().trim() === tenant.full_name.toLowerCase().trim())
              )
            )
          }

          // 2. Try match by extracted name
          if (!matchedCheckIn && extractedName) {
            matchedCheckIn = checkInRequests.find((cir: any) => 
              cir.full_name && cir.full_name.toLowerCase().trim() === extractedName?.toLowerCase().trim()
            )
          }

          // 3. For initial check-in payments without tenant, try match by amount
          if (!matchedCheckIn && !isCheckoutPenaltyOrClaim) {
            const paymentAmount = parseFloat(payment.amount)
            matchedCheckIn = checkInRequests.find((cir: any) => 
              !usedCheckInIds.has(cir.id) && Math.abs(parseFloat(cir.total_amount) - paymentAmount) < 0.01
            )
          }

          // 4. Fallback for unlinked payments
          if (!matchedCheckIn && !isCheckoutPenaltyOrClaim) {
            matchedCheckIn = checkInRequests.find((cir: any) => !usedCheckInIds.has(cir.id))
          }
        }

        if (matchedCheckIn && !isCheckoutPenaltyOrClaim) {
          usedCheckInIds.add(matchedCheckIn.id)
        }

        // Construct synthetic tenant data if missing
        if (!tenant && (extractedName || matchedCheckIn)) {
          tenant = {
            id: payment.tenant_id,
            full_name: extractedName || matchedCheckIn?.full_name || 'Tamu Checkout',
            rooms: {
              room_number: extractedRoom || matchedCheckIn?.rooms?.room_number || '-',
              floors: {
                branches: {
                  name: matchedCheckIn?.rooms?.floors?.branches?.name || 'Graha Aisyah Menteng'
                }
              }
            }
          }
        }

        enrichedPayments.push({
          ...payment,
          tenants: tenant,
          check_in_request: matchedCheckIn || null,
          deposit_amount: isCheckoutPenaltyOrClaim ? 0 : (matchedCheckIn?.deposit_amount !== undefined && matchedCheckIn?.deposit_amount !== null ? matchedCheckIn.deposit_amount : (tenant?.deposit_amount !== undefined ? tenant.deposit_amount : 0))
        })
      })
      
      paymentsData = enrichedPayments
    }
  } catch (e) {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception processing payments:', e)
    }
    paymentsData = []
    paymentsError = e as any
  }

  // Only log if it's not a "relation doesn't exist" error and has meaningful info
  if (paymentsError) {
    const errorCode = (paymentsError as any).code
    const errorMessage = (paymentsError as any).message
    const errorDetails = (paymentsError as any).details
    const errorHint = (paymentsError as any).hint
    
    const isNoRowsError = errorCode === 'PGRST116'
    const hasErrorInfo = Boolean(
      (errorCode && String(errorCode).trim()) ||
      (errorMessage && String(errorMessage).trim()) ||
      (errorDetails && String(errorDetails).trim()) ||
      (errorHint && String(errorHint).trim())
    )
    
    if (hasErrorInfo && !isNoRowsError) {
      console.error('Error fetching payments:', {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        hint: errorHint
      })
    }
  }

  // Fetch all staff and owner profiles for shift filtering
  const { data: allStaff } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['staff', 'owner'])
    .order('full_name', { ascending: true })

  return (
    <PaymentList 
      initialTenants={tenantsWithCheckIn} 
      initialPayments={paymentsData || []} 
      allStaff={allStaff || []}
      currentUser={{
        id: user.id,
        role: userRole || 'staff',
        name: userFullName || 'Petugas'
      }}
    />
  )
}