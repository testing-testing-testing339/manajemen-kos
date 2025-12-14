'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createTenant(prevState: any, formData: FormData) {
  const room_id = formData.get('room_id') as string
  const full_name = formData.get('full_name') as string
  const id_card_url = formData.get('id_card_url') as string
  const check_in_date = formData.get('check_in_date') as string
  const payment_due_date = formData.get('payment_due_date') as string
  const electricity_meter_start = parseFloat(formData.get('electricity_meter_start') as string)

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

  // Insert tenant
  const { error: insertError } = await supabase.from('tenants').insert({
    room_id,
    full_name,
    id_card_url,
    check_in_date,
    payment_due_date,
    electricity_meter_start
  })

  if (insertError) return { error: insertError.message }

  // Update room to occupied
  const { error: updateError } = await supabase.from('rooms').update({ is_occupied: true }).eq('id', room_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard/kamar')

  return { success: true }
}

export async function deleteTenant(prevState: any, formData: FormData) {
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

  // Get room_id
  const { data: tenant } = await supabase.from('tenants').select('room_id').eq('id', id).single()

  if (!tenant) return { error: 'Tenant not found' }

  // Delete tenant
  const { error: deleteError } = await supabase.from('tenants').delete().eq('id', id)

  if (deleteError) return { error: deleteError.message }

  // Update room to not occupied
  const { error: updateError } = await supabase.from('rooms').update({ is_occupied: false }).eq('id', tenant.room_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard/kamar')

  return { success: true }
}