'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createRoom(prevState: any, formData: FormData) {
  const floor_id = formData.get('floor_id') as string
  const room_number = formData.get('room_number') as string
  const price = parseFloat(formData.get('price') as string)
  const facilitiesStr = formData.get('facilities') as string
  const facilities = facilitiesStr.split(',').map(f => f.trim()).filter(f => f)

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

  const { error } = await supabase.from('rooms').insert({ floor_id, room_number, price, facilities })

  if (error) return { error: error.message }

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

  const { error } = await supabase.from('rooms').delete().eq('id', id)

  if (error) return { error: error.message }

  return { success: true }
}