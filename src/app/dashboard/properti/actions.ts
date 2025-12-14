'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Branch actions
export async function addBranch(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const address = formData.get('address') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can add branches' }
  }

  const { error } = await supabase.from('branches').insert({ name, address })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

export async function deleteBranch(prevState: any, formData: FormData) {
  const id = formData.get('id') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can delete branches' }
  }

  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

// Floor actions
export async function addFloor(prevState: any, formData: FormData) {
  const branch_id = formData.get('branch_id') as string
  const name = formData.get('name') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can add floors' }
  }

  const { error } = await supabase.from('floors').insert({ branch_id, name })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

export async function deleteFloor(prevState: any, formData: FormData) {
  const id = formData.get('id') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can delete floors' }
  }

  const { error } = await supabase.from('floors').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

// Room actions
export async function createRoom(prevState: any, formData: FormData) {
  const floor_id = formData.get('floor_id') as string
  const room_number = formData.get('room_number') as string
  const price_per_day = formData.get('price_per_day') ? parseFloat(formData.get('price_per_day') as string) : null
  const price_per_month = parseFloat(formData.get('price_per_month') as string)
  const price_per_6months = formData.get('price_per_6months') ? parseFloat(formData.get('price_per_6months') as string) : null
  const facilitiesStr = formData.get('facilities') as string
  const facilities = facilitiesStr ? facilitiesStr.split(',').map(f => f.trim()).filter(f => f) : []
  
  // For backward compatibility, use price_per_month as price
  const price = price_per_month

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can add rooms' }
  }

  const { error } = await supabase.from('rooms').insert({ 
    floor_id, 
    room_number, 
    price, // Backward compatibility
    price_per_day,
    price_per_month,
    price_per_6months,
    facilities 
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

export async function deleteRoom(prevState: any, formData: FormData) {
  const id = formData.get('id') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Only owner can delete rooms' }
  }

  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

