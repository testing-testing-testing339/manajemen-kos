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
  let openTicketsCount = 0
  
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
        
        // Get open tickets count for owner/staff
        if (profile.role === 'owner' || profile.role === 'staff') {
          try {
            if (profile.role === 'owner') {
              // Owner can see all open tickets
              const { count } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress'])
              
              openTicketsCount = count || 0
            } else if (profile.role === 'staff' && profile.branch_id) {
              // Staff can only see tickets in their branch
              // Get all rooms in their branch via floors
              const { data: floors } = await supabase
                .from('floors')
                .select('id')
                .eq('branch_id', profile.branch_id)
              
              if (floors && floors.length > 0) {
                const floorIds = floors.map((f: any) => f.id)
                const { data: rooms } = await supabase
                  .from('rooms')
                  .select('id')
                  .in('floor_id', floorIds)
                
                if (rooms && rooms.length > 0) {
                  const roomIds = rooms.map((r: any) => r.id)
                  const { count } = await supabase
                    .from('tickets')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['open', 'in_progress'])
                    .in('room_id', roomIds)
                  
                  openTicketsCount = count || 0
                }
              }
            }
          } catch (error) {
            // Silently fail - don't break sidebar if tickets query fails
            openTicketsCount = 0
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

  return <SidebarClient userRole={userRole} initialOpenTicketsCount={openTicketsCount} />
}

