import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
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
  let userRole: string | null = null
  let userBranchId: string | null = null
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, branch_id')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      userRole = profile.role || null
      userBranchId = profile.branch_id || null
    }
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
        .select('id, assigned_room_id, total_amount, rental_duration, rental_days')
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
          .select('id, full_name, rooms(room_number, floors(branches(name)))')
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
      
      // Prepare check-in requests query for payments (for checkout tenants)
      let checkInRequestsQuery = supabase
        .from('check_in_requests')
        .select('id, full_name, phone, payment_proof_url, total_amount, assigned_room_id, assigned_at, created_at, id_card_number, rental_duration, rental_days, rooms(room_number, floors(branches(name)))')
        .eq('status', 'completed')
      
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
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        if (confirmedByIds.length > 0) {
          console.log('Attempting to fetch profiles for IDs:', confirmedByIds)
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          }
          if (profiles) {
            console.log('Fetched profiles:', profiles.length, 'profiles found')
          }
        }
        if (checkInRequestsError) {
          console.error('Error fetching check-in requests:', checkInRequestsError)
        }
      }
      
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
      } else if (confirmedByIds.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No profiles found for confirmed_by IDs:', confirmedByIds)
          console.warn('This might be due to RLS policy restrictions')
        }
      }
      
      // Process check-in requests for payments (for checkout tenants)
      if (checkInRequests && checkInRequests.length > 0) {
        // Get all assigned room IDs from check-in requests
        const assignedRoomIds = checkInRequests
          .map((cir: any) => cir.assigned_room_id)
          .filter(Boolean)
        
        if (assignedRoomIds.length > 0) {
          // Get all active tenants in these rooms
          const { data: tenantsFromCheckIn } = await supabase
            .from('tenants')
            .select('id, room_id, full_name')
            .in('room_id', assignedRoomIds)
          
          // Create a map: tenant_id -> check_in_request (for active tenants)
          const tenantToCheckInMap = new Map()
          if (tenantsFromCheckIn) {
            tenantsFromCheckIn.forEach((tenant: any) => {
              const checkIn = checkInRequests.find((cir: any) => cir.assigned_room_id === tenant.room_id)
              if (checkIn) {
                tenantToCheckInMap.set(tenant.id, checkIn)
              }
            })
          }
          
          // Create a map: room_id -> check_in_request (for matching by room)
          const roomToCheckInMap = new Map()
          checkInRequests.forEach((cir: any) => {
            if (cir.assigned_room_id) {
              roomToCheckInMap.set(cir.assigned_room_id, cir)
            }
          })
          
          // Get all active tenant room IDs for filtering checkout check-ins
          const activeTenantRoomIds = new Set(tenantsFromCheckIn?.map((t: any) => t.room_id) || [])
          
          // Enrich payments with check-in request data
          // For staff, only include payments that match check-in requests in their branch (already filtered above)
          const enrichedPayments: any[] = []
          
          paymentsData.forEach((payment: any) => {
            // If payment has tenant_id, try to find check-in request via tenant
            if (payment.tenant_id && tenantToCheckInMap.has(payment.tenant_id)) {
              const checkIn = tenantToCheckInMap.get(payment.tenant_id)
              enrichedPayments.push({ ...payment, check_in_request: checkIn })
              return
            }
            
            // If payment has no tenant_id (checkout), try to match by amount and date proximity
            // Only match with check-in requests for rooms that are no longer occupied
            // Only match with check-in requests in staff's branch (already filtered above)
            if (!payment.tenant_id) {
              const paymentDate = new Date(payment.payment_date)
              const paymentAmount = parseFloat(payment.amount)
              
              // Find best matching check-in request
              // Priority: 1) Exact amount match, 2) Date within 3 days, 3) Room not currently occupied
              let bestMatch: any = null
              let bestScore = 0
              
              checkInRequests.forEach((cir: any) => {
                // Skip if this room is still occupied
                if (cir.assigned_room_id && activeTenantRoomIds.has(cir.assigned_room_id)) {
                  return
                }
                
                const checkInAmount = parseFloat(cir.total_amount)
                const checkInDate = new Date(cir.created_at)
                const daysDiff = Math.abs((paymentDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                
                // Calculate match score
                let score = 0
                if (Math.abs(checkInAmount - paymentAmount) < 0.01) {
                  score += 100 // Exact amount match
                }
                if (daysDiff <= 3) {
                  score += 50 - (daysDiff * 10) // Closer dates get higher score
                }
                
                if (score > bestScore) {
                  bestScore = score
                  bestMatch = cir
                }
              })
              
              if (bestMatch && bestScore >= 50) {
                enrichedPayments.push({ ...payment, check_in_request: bestMatch })
                return
              }
            }
            
            // If staff, only include payments that matched (either via tenant or check-in request)
            // Owner can see all payments even if no match
            if (userRole === 'staff') {
              // For staff, exclude payments that didn't match any check-in request
              // (these are payments from other branches)
              return
            }
            
            // For owner, include all payments even if no match
            enrichedPayments.push(payment)
          })
          
          // Replace paymentsData with enriched payments
          paymentsData = enrichedPayments
        }
      }
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

  return (
    <PaymentList 
      initialTenants={tenantsWithCheckIn} 
      initialPayments={paymentsData || []} 
    />
  )
}