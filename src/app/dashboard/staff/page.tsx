import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StaffList from './StaffList'

export default async function StaffPage() {
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

  // Check if user is owner
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only owner can access this page
  if (profile?.role !== 'owner') {
    redirect('/dashboard')
  }

  // Get all staff (non-owner profiles)
  // Use eq('role', 'staff') instead of neq('role', 'owner') for better performance
  let staffData: any[] = []
  let staffError: any = null
  
  try {
    // First try with branches relation
    const { data, error } = await supabase
      .from('profiles')
      .select('*, branches(id, name)')
      .eq('role', 'staff')
      .order('full_name', { ascending: true })
    
    if (error) {
      // If error with relation, try without branches relation
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('foreign key')) {
        const { data: simpleData, error: simpleError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'staff')
          .order('full_name', { ascending: true })
        
        if (!simpleError && simpleData) {
          staffData = simpleData
          staffError = null
          
          // Manually fetch branches for each staff
          if (staffData.length > 0) {
            const branchIds = [...new Set(staffData.map(s => s.branch_id).filter(Boolean))]
            if (branchIds.length > 0) {
              const { data: branchesData } = await supabase
                .from('branches')
                .select('id, name')
                .in('id', branchIds)
              
              // Map branches to staff
              if (branchesData) {
                staffData = staffData.map(staff => ({
                  ...staff,
                  branches: branchesData.find(b => b.id === staff.branch_id) ? { id: branchesData.find(b => b.id === staff.branch_id)!.id, name: branchesData.find(b => b.id === staff.branch_id)!.name } : null
                }))
              }
            }
          }
        } else {
          staffError = simpleError
        }
      } else {
        staffError = error
      }
    } else {
      staffData = data || []
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Staff data fetched:', staffData.length, 'staff members')
      if (staffError) {
        console.log('Staff error:', staffError)
      }
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching staff:', error)
    }
    staffError = error
  }

  // Get all branches for dropdown
  const { data: branchesData, error: branchesError } = await supabase
    .from('branches')
    .select('id, name')
    .order('name', { ascending: true })

  // Silently handle errors - don't log empty error objects
  // Only log in development if there's actual error information
  if (staffError && process.env.NODE_ENV === 'development') {
    const errorCode = staffError.code
    const errorMessage = staffError.message
    const errorDetails = staffError.details
    const errorHint = staffError.hint
    
    const hasErrorInfo = Boolean(
      (errorCode && String(errorCode).trim()) ||
      (errorMessage && String(errorMessage).trim()) ||
      (errorDetails && String(errorDetails).trim()) ||
      (errorHint && String(errorHint).trim())
    )
    
    if (hasErrorInfo) {
      console.error('Error fetching staff:', {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        hint: errorHint
      })
    }
  }
  
  if (branchesError && process.env.NODE_ENV === 'development') {
    const errorCode = branchesError.code
    const errorMessage = branchesError.message
    const errorDetails = branchesError.details
    const errorHint = branchesError.hint
    
    const hasErrorInfo = Boolean(
      (errorCode && String(errorCode).trim()) ||
      (errorMessage && String(errorMessage).trim()) ||
      (errorDetails && String(errorDetails).trim()) ||
      (errorHint && String(errorHint).trim())
    )
    
    if (hasErrorInfo) {
      console.error('Error fetching branches:', {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        hint: errorHint
      })
    }
  }

  return (
    <StaffList 
      initialStaff={staffData || []} 
      initialBranches={branchesData || []} 
    />
  )
}

