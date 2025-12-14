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

  // Get all payments
  let paymentsData = []
  let paymentsError = null
  try {
    // Try with relation first
    const result = await supabase
      .from('payments')
      .select('*, profiles!payments_confirmed_by_fkey(full_name)')
      .order('created_at', { ascending: false })
    
    if (result.error) {
      // If relation fails, try without relation
      if (result.error.code === 'PGRST116' || result.error.message?.includes('relation') || result.error.message?.includes('foreign key')) {
        const simpleResult = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
        paymentsData = simpleResult.data || []
        paymentsError = simpleResult.error
      } else {
        paymentsData = result.data || []
        paymentsError = result.error
      }
    } else {
      paymentsData = result.data || []
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

