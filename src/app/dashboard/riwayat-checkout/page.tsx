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

    if (!historyError && historyData) {
      checkoutHistoryList = historyData
    }
  } catch (err) {
    console.warn('checkout_history table fetch:', err)
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
