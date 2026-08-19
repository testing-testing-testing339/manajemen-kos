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
  const electricity_meter_start = parseFloat(formData.get('electricity_meter_start') as string) || 0

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
  revalidatePath('/dashboard/properti')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function processCheckout(prevState: any, formData: FormData) {
  const id = formData.get('id') as string
  const late_fee = parseFloat(formData.get('late_fee') as string) || 0
  const damage_fee = parseFloat(formData.get('damage_fee') as string) || 0
  const deposit_refund = parseFloat(formData.get('deposit_refund') as string) || 0
  const checkout_notes = (formData.get('notes') as string) || ''

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

  // Get tenant and room details
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, room_id, full_name')
    .eq('id', id)
    .single()

  if (!tenant) return { error: 'Data penghuni tidak ditemukan' }

  // 1. If there is a late fee or damage fee, record as late checkout payment
  if (late_fee > 0 || damage_fee > 0) {
    await supabase.from('payments').insert({
      tenant_id: tenant.id,
      amount: late_fee + damage_fee,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'deposit_deduction',
      status: 'confirmed',
      notes: `Denda checkout telat: Rp ${late_fee.toLocaleString('id-ID')} | Kerusakan: Rp ${damage_fee.toLocaleString('id-ID')} | Pengembalian deposit: Rp ${deposit_refund.toLocaleString('id-ID')}. Catatan: ${checkout_notes}`
    })
  }

  // 2. Delete / Archive tenant record
  const { error: deleteError } = await supabase.from('tenants').delete().eq('id', id)

  if (deleteError) return { error: deleteError.message }

  // 3. Mark room as unoccupied
  const { error: updateError } = await supabase
    .from('rooms')
    .update({ is_occupied: false })
    .eq('id', tenant.room_id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard/kamar')
  revalidatePath('/dashboard/properti')
  revalidatePath('/dashboard/pembayaran')
  revalidatePath('/dashboard')

  return { 
    success: true, 
    message: `Check-out selesai untuk ${tenant.full_name}. Deposit dikembalikan: Rp ${deposit_refund.toLocaleString('id-ID')}` 
  }
}

export async function deleteTenant(prevState: any, formData: FormData) {
  return processCheckout(prevState, formData)
}