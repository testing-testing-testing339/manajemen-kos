'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updatePlnId(prevState: any, formData: FormData) {
  const room_id = formData.get('room_id') as string
  const pln_id = (formData.get('pln_id') as string)?.trim() || ''

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

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Hanya Owner yang memiliki akses untuk mengubah Nomor ID PLN' }
  }

  // Get current room facilities
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('id, room_number, facilities')
    .eq('id', room_id)
    .single()

  if (fetchError || !room) {
    return { error: 'Kamar tidak ditemukan' }
  }

  // Filter out existing PLN ID from facilities
  const currentFacilities: string[] = Array.isArray(room.facilities) ? room.facilities : []
  const cleanFacilities = currentFacilities.filter(
    (f: string) => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('pln:')
  )

  // Append new PLN ID if provided
  if (pln_id) {
    cleanFacilities.push(`ID PLN: ${pln_id}`)
  }

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ facilities: cleanFacilities })
    .eq('id', room_id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/pln')
  revalidatePath('/dashboard/properti')
  revalidatePath('/dashboard/kamar')
  revalidatePath('/dashboard')

  return { success: true, message: `Nomor ID PLN Kamar ${room.room_number} berhasil diperbarui` }
}
