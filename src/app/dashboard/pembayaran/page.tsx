import { createServerClient } from '@supabase/ssr'
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

  // Get all tenants with their room info and payment status
  const { data: tenantsData, error: tenantsError } = await supabase
    .from('tenants')
    .select('*, rooms(room_number, price, floors(branches(name)))')
    .order('payment_due_date', { ascending: true })

  // Get all payments - include tenant info where available
  // Note: tenant_id can be null after tenant checkout, so we need to handle that
  let paymentsData = []
  let paymentsError = null
  try {
    // First, get all payments (including those with null tenant_id)
    const paymentsResult = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (paymentsResult.error) {
      paymentsData = []
      paymentsError = paymentsResult.error
    } else {
      paymentsData = paymentsResult.data || []
      
      // For payments with tenant_id, try to get tenant info
      // We'll enrich the data in the component since Supabase doesn't support left joins easily
      const paymentsWithTenantId = paymentsData.filter((p: any) => p.tenant_id)
      
      if (paymentsWithTenantId.length > 0) {
        const tenantIds = paymentsWithTenantId.map((p: any) => p.tenant_id)
        const { data: tenantsForPayments } = await supabase
          .from('tenants')
          .select('id, full_name, rooms(room_number, floors(branches(name)))')
          .in('id', tenantIds)
        
        // Enrich payments with tenant data
        if (tenantsForPayments) {
          paymentsData = paymentsData.map((payment: any) => {
            if (payment.tenant_id) {
              const tenant = tenantsForPayments.find((t: any) => t.id === payment.tenant_id)
              if (tenant) {
                return { ...payment, tenants: tenant }
              }
            }
            return payment
          })
        }
      }
      
      // Try to get confirmed_by profile info
      try {
        const paymentsWithConfirmedBy = paymentsData.filter((p: any) => p.confirmed_by)
        if (paymentsWithConfirmedBy.length > 0) {
          const confirmedByIds = paymentsWithConfirmedBy.map((p: any) => p.confirmed_by).filter(Boolean)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', confirmedByIds)
          
          if (profiles) {
            paymentsData = paymentsData.map((payment: any) => {
              if (payment.confirmed_by) {
                const profile = profiles.find((p: any) => p.id === payment.confirmed_by)
                if (profile) {
                  return { ...payment, profiles: profile }
                }
              }
              return payment
            })
          }
        }
      } catch (e) {
        // Ignore profile fetch errors
      }
    }
  } catch (error: any) {
    // If table doesn't exist or other error, try simple query
    try {
      const result = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
      paymentsData = result.data || []
      paymentsError = result.error
    } catch (e) {
      // Table might not exist yet, that's okay
      if (process.env.NODE_ENV === 'development') {
        console.log('Payments table might not exist yet')
      }
    }
  }

  if (tenantsError && process.env.NODE_ENV === 'development') {
    const errorCode = tenantsError.code
    const errorMessage = tenantsError.message
    const hasErrorInfo = Boolean(
      (errorCode && String(errorCode).trim()) ||
      (errorMessage && String(errorMessage).trim())
    )
    if (hasErrorInfo) {
      console.error('Error fetching tenants:', {
        code: errorCode,
        message: errorMessage
      })
    }
  }
  
  if (paymentsError && process.env.NODE_ENV === 'development') {
    const errorCode = paymentsError.code
    const errorMessage = paymentsError.message
    const errorDetails = paymentsError.details
    const errorHint = paymentsError.hint
    
    // Only log if it's not a "relation doesn't exist" error and has meaningful info
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
      initialTenants={tenantsData || []} 
      initialPayments={paymentsData || []} 
    />
  )
}

