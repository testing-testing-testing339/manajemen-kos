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
  const price_per_day = parseFloat(formData.get('price_per_day') as string) // Required
  const price_per_month = formData.get('price_per_month') ? parseFloat(formData.get('price_per_month') as string) : null
  const price_per_6months = formData.get('price_per_6months') ? parseFloat(formData.get('price_per_6months') as string) : null
  const facilitiesStr = formData.get('facilities') as string
  const facilities = facilitiesStr ? facilitiesStr.split(',').map(f => f.trim()).filter(f => f) : []
  const damage_notes = (formData.get('damage_notes') as string)?.trim() || null
  
  // For backward compatibility, use price_per_day * 30 as default monthly price, or use price_per_month if provided
  const price = price_per_month || (price_per_day * 30)

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
    facilities,
    damage_notes
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

export async function updateRoom(prevState: any, formData: FormData) {
  const id = formData.get('id') as string
  const floor_id = formData.get('floor_id') as string
  const room_number = formData.get('room_number') as string
  const price_per_day = parseFloat(formData.get('price_per_day') as string)
  const price_per_month = formData.get('price_per_month') ? parseFloat(formData.get('price_per_month') as string) : null
  const price_per_6months = formData.get('price_per_6months') ? parseFloat(formData.get('price_per_6months') as string) : null
  const facilitiesStr = formData.get('facilities') as string
  let facilities = facilitiesStr ? facilitiesStr.split(',').map(f => f.trim()).filter(f => f) : []
  
  const pln_id = (formData.get('pln_id') as string)?.trim()
  if (pln_id !== undefined) {
    facilities = facilities.filter(f => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('pln:'))
    if (pln_id) {
      facilities.push(`ID PLN: ${pln_id}`)
    }
  }
  
  const damage_notes = (formData.get('damage_notes') as string)?.trim() || null
  
  // For backward compatibility
  const price = price_per_month || (price_per_day * 30)

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
    return { error: 'Only owner can update rooms' }
  }

  const { error } = await supabase
    .from('rooms')
    .update({ 
      floor_id, 
      room_number, 
      price, // Backward compatibility
      price_per_day,
      price_per_month,
      price_per_6months,
      facilities,
      damage_notes
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true }
}

export async function bulkCreateRooms(prevState: any, formData: FormData) {
  const floor_id = formData.get('floor_id') as string
  const start_room_number = formData.get('start_room_number') as string
  const room_count = parseInt(formData.get('room_count') as string)
  const price_per_day = parseFloat(formData.get('price_per_day') as string)
  const price_per_month = formData.get('price_per_month') ? parseFloat(formData.get('price_per_month') as string) : null
  const price_per_6months = formData.get('price_per_6months') ? parseFloat(formData.get('price_per_6months') as string) : null
  const facilitiesStr = formData.get('facilities') as string
  const facilities = facilitiesStr ? facilitiesStr.split(',').map(f => f.trim()).filter(f => f) : []

  if (room_count < 1 || room_count > 100) {
    return { error: 'Jumlah kamar harus antara 1-100' }
  }

  // For backward compatibility
  const price = price_per_month || (price_per_day * 30)

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

  // Extract base number and suffix from start_room_number
  // Example: "101" -> base: 101, suffix: ""
  // Example: "A101" -> base: 101, suffix: "A"
  const match = start_room_number.match(/^([A-Za-z]*)(\d+)$/)
  if (!match) {
    return { error: 'Format nomor kamar tidak valid. Gunakan format: 101 atau A101' }
  }

  const prefix = match[1] || ''
  const startNumber = parseInt(match[2])

  // Generate room numbers
  const roomsToInsert = []
  for (let i = 0; i < room_count; i++) {
    const roomNumber = `${prefix}${startNumber + i}`
    roomsToInsert.push({
      floor_id,
      room_number: roomNumber,
      price,
      price_per_day,
      price_per_month,
      price_per_6months,
      facilities
    })
  }

  const { error } = await supabase.from('rooms').insert(roomsToInsert)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/properti')
  return { success: true, count: room_count }
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

