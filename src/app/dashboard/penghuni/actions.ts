'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getWIBDateString } from '@/lib/dateUtils'

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
  const additional_pay_needed = parseFloat(formData.get('additional_pay_needed') as string) || 0
  const claimed_deposit_input = parseFloat(formData.get('claimed_deposit') as string) || 0
  const additional_payment_method = (formData.get('additional_payment_method') as string) || 'cash'
  const checkout_notes = (formData.get('notes') as string) || ''

  const checkout_date_input = (formData.get('checkout_date') as string) || getWIBDateString()
  const checkout_time_input = (formData.get('checkout_time') as string) || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

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

  // Use service role if available for reliable administrative actions
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminClient = serviceRoleKey 
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : supabase

  const { data: { user } } = await supabase.auth.getUser()

  // Get tenant and room details
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, room_id, full_name, deposit_amount, check_in_date, payment_due_date, rooms(room_number, room_type, floors(name, branches(name)))')
    .eq('id', id)
    .single()

  if (!tenant) return { error: 'Data penghuni tidak ditemukan' }

  const roomData = tenant.rooms as any
  const roomNumber = roomData?.room_number || '-'
  const floorName = roomData?.floors?.name || '-'
  const roomType = roomData?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room'

  let tenantPhone = ''
  if (tenant.room_id) {
    const { data: cir } = await adminClient
      .from('check_in_requests')
      .select('phone')
      .eq('assigned_room_id', tenant.room_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cir?.phone) tenantPhone = cir.phone
  }

  // Get admin profile name
  let processedByName = 'Resepsionis'
  if (user) {
    const { data: userProfile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    processedByName = userProfile?.full_name || user.email || 'Resepsionis'
  }

  const tenantDeposit = tenant.deposit_amount !== undefined && tenant.deposit_amount !== null ? parseFloat(tenant.deposit_amount) : 0
  const totalCharge = late_fee + damage_fee
  const actualClaimedDeposit = claimed_deposit_input > 0 ? claimed_deposit_input : Math.min(tenantDeposit, totalCharge)
  const actualExtraToPay = additional_pay_needed > 0 ? additional_pay_needed : Math.max(0, totalCharge - tenantDeposit)
  const actualRefund = Math.max(0, tenantDeposit - totalCharge)

  const todayStr = getWIBDateString()
  const timestampStr = new Date().toISOString()

  // 1. Catat ke tabel checkout_history
  try {
    await adminClient.from('checkout_history').insert({
      tenant_name: tenant.full_name,
      phone: tenantPhone || null,
      room_number: roomNumber,
      floor_name: floorName,
      room_type: roomType,
      check_in_date: tenant.check_in_date || null,
      due_date: tenant.payment_due_date || null,
      checkout_date: checkout_date_input,
      checkout_time: checkout_time_input,
      deposit_amount: tenantDeposit,
      late_fee: late_fee,
      damage_fee: damage_fee,
      claimed_deposit: actualClaimedDeposit,
      deposit_refund: actualRefund,
      additional_pay_needed: actualExtraToPay,
      notes: checkout_notes || null,
      processed_by: processedByName,
      created_at: timestampStr
    })
  } catch (histErr) {
    console.warn('Could not insert to checkout_history directly:', histErr)
  }

  // 2. If deposit is claimed (for late fee or damages), record as claimed deposit transaction
  if (actualClaimedDeposit > 0) {
    const claimNotes = `[Klaim Deposit] Tamu: ${tenant.full_name} | Kamar: ${roomNumber} | Denda Telat: Rp ${late_fee.toLocaleString('id-ID')} | Kerusakan: Rp ${damage_fee.toLocaleString('id-ID')} | Deposit Terklaim: Rp ${actualClaimedDeposit.toLocaleString('id-ID')} | Sisa Deposit Kembali: Rp ${actualRefund.toLocaleString('id-ID')}${checkout_notes ? ` | Catatan: ${checkout_notes}` : ''}`
    
    await adminClient.from('payments').insert({
      tenant_id: null,
      amount: actualClaimedDeposit,
      payment_date: todayStr,
      payment_method: 'deposit_deduction',
      status: 'confirmed',
      confirmed_by: user?.id || null,
      confirmed_at: timestampStr,
      notes: claimNotes
    })
  }

  // 3. If charges exceeded deposit, record the additional excess payment settled by guest
  if (actualExtraToPay > 0) {
    const extraMethod = additional_payment_method === 'transfer' ? 'transfer' : 'cash'
    const extraNotes = `[Pelunasan Check-Out] Tamu: ${tenant.full_name} | Kamar: ${roomNumber} | Pelunasan Biaya Tambahan/Kerusakan (Kekurangan Denda Melebihi Deposit)${checkout_notes ? ` | Catatan: ${checkout_notes}` : ''}`
    
    await adminClient.from('payments').insert({
      tenant_id: null,
      amount: actualExtraToPay,
      payment_date: todayStr,
      payment_method: extraMethod,
      status: 'confirmed',
      confirmed_by: user?.id || null,
      confirmed_at: timestampStr,
      notes: extraNotes
    })
  }

  // 4. Mark check-in request as checked_out
  if (tenant.room_id) {
    await adminClient
      .from('check_in_requests')
      .update({ status: 'checked_out' })
      .eq('assigned_room_id', tenant.room_id)
      .eq('status', 'completed')
  }

  // 5. Mark room as unoccupied
  if (tenant.room_id) {
    await adminClient
      .from('rooms')
      .update({ is_occupied: false })
      .eq('id', tenant.room_id)
  }

  // 6. Delete tenant record
  const { error: deleteError } = await adminClient.from('tenants').delete().eq('id', id)
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard/riwayat-checkout')
  revalidatePath('/dashboard/kamar')
  revalidatePath('/dashboard/properti')
  revalidatePath('/dashboard/pembayaran')
  revalidatePath('/dashboard')

  return { 
    success: true, 
    message: `Check-out selesai untuk ${tenant.full_name}. Deposit dikembalikan: Rp ${actualRefund.toLocaleString('id-ID')}` 
  }
}

export async function deleteTenant(prevState: any, formData: FormData) {
  return processCheckout(prevState, formData)
}