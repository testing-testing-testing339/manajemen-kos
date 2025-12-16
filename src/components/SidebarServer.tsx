import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SidebarClient from './SidebarClient'

export default async function SidebarServer() {
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
          // No-op
        },
      },
    }
  )

  // Get user role for sidebar
  const { data: { user } } = await supabase.auth.getUser()
  let userRole: string | null = null
  let pendingCheckInsCount = 0
  
  if (user) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        // Only log in development if there's actual error information
        if (process.env.NODE_ENV === 'development') {
          const errorCode = profileError.code
          const errorMessage = profileError.message
          const hasErrorInfo = Boolean(
            (errorCode && String(errorCode).trim()) ||
            (errorMessage && String(errorMessage).trim())
          )
          if (hasErrorInfo) {
            console.error('SidebarServer - Error fetching profile:', {
              code: errorCode,
              message: errorMessage,
              details: profileError.details,
              hint: profileError.hint,
              userId: user.id
            })
          }
        }
      } else if (profile) {
        userRole = profile.role || null
        
        // Get pending check-ins count for owner/staff
        if (profile.role === 'owner' || profile.role === 'staff') {
          try {
            let checkInsQuery = supabase
              .from('check_in_requests')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending')
            
            if (profile.role === 'staff' && profile.branch_id) {
              checkInsQuery = checkInsQuery.eq('branch_id', profile.branch_id)
            }
            
            const { count } = await checkInsQuery
            pendingCheckInsCount = count || 0
          } catch (error) {
            // Silently fail
            pendingCheckInsCount = 0
          }
        }
      }
    } catch (error: any) {
      // Silently handle errors
      if (process.env.NODE_ENV === 'development') {
        console.error('SidebarServer - Exception:', error?.message || error)
      }
    }
  }

  return <SidebarClient 
    userRole={userRole} 
    initialPendingCheckInsCount={pendingCheckInsCount}
  />
}

