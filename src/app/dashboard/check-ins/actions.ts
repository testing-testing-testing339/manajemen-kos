'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getWIBDateString, calculateCheckoutDueDate } from '@/lib/dateUtils'

export async function approveCheckIn(prevState: any, formData: FormData) {
  const check_in_id = formData.get('check_in_id') as string

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
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  // Check if user can approve this check-in
  const { data: checkIn } = await supabase
    .from('check_in_requests')
    .select('branch_id')
    .eq('id', check_in_id)
    .single()

  if (!checkIn) {
    return { error: 'Check-in request not found' }
  }

  if (profile?.role === 'staff' && checkIn.branch_id !== profile.branch_id) {
    return { error: 'You can only approve check-ins in your branch' }
  }

  if (profile?.role !== 'owner' && profile?.role !== 'staff') {
    return { error: 'Only owner or staff can approve check-ins' }
  }

  // Get check-in request data to create payment
  const { data: checkInData } = await supabase
    .from('check_in_requests')
    .select('total_amount')
    .eq('id', check_in_id)
    .single()

  const { error } = await supabase
    .from('check_in_requests')
    .update({
      status: 'approved',
      assigned_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', check_in_id)

  if (error) return { error: error.message }

  // Note: Payment will be created when room is assigned (in assignRoom function)
  // This ensures payment is linked to the actual tenant record

  revalidatePath('/dashboard/check-ins')
  return { success: true }
}

export async function rejectCheckIn(prevState: any, formData: FormData) {
  const check_in_id = formData.get('check_in_id') as string

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
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  const { data: checkIn } = await supabase
    .from('check_in_requests')
    .select('branch_id')
    .eq('id', check_in_id)
    .single()

  if (!checkIn) {
    return { error: 'Check-in request not found' }
  }

  if (profile?.role === 'staff' && checkIn.branch_id !== profile.branch_id) {
    return { error: 'You can only reject check-ins in your branch' }
  }

  if (profile?.role !== 'owner' && profile?.role !== 'staff') {
    return { error: 'Only owner or staff can reject check-ins' }
  }

  const rejection_reason = (formData.get('rejection_reason') as string)?.trim() || (formData.get('reason') as string)?.trim() || 'Data formulir tidak sesuai atau berkas kurang jelas'

  // Update check-in status to rejected with reason
  let updateData: any = {
    status: 'rejected',
    rejection_reason: rejection_reason,
    assigned_by: user.id,
    updated_at: new Date().toISOString()
  }

  let { error } = await supabase
    .from('check_in_requests')
    .update(updateData)
    .eq('id', check_in_id)

  // If column rejection_reason is not yet added in Supabase, fallback safely
  if (error && error.message?.includes('rejection_reason')) {
    const { error: fallbackError } = await supabase
      .from('check_in_requests')
      .update({
        status: 'rejected',
        assigned_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', check_in_id)
    if (fallbackError) return { error: fallbackError.message }
  } else if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/check-ins')
  return { success: true }
}

export async function assignRoom(prevState: any, formData: FormData) {
  const check_in_id = formData.get('check_in_id') as string
  const room_id = formData.get('room_id') as string

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
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  // Get check-in request
  const { data: checkIn } = await supabase
    .from('check_in_requests')
    .select('branch_id, status')
    .eq('id', check_in_id)
    .single()

  if (!checkIn) {
    return { error: 'Check-in request not found' }
  }

  if (checkIn.status !== 'pending' && checkIn.status !== 'approved') {
    return { error: 'Permintaan check-in tidak valid atau sudah selesai' }
  }

  if (profile?.role === 'staff' && checkIn.branch_id !== profile.branch_id) {
    return { error: 'You can only assign rooms for check-ins in your branch' }
  }

  if (profile?.role !== 'owner' && profile?.role !== 'staff') {
    return { error: 'Only owner or staff can assign rooms' }
  }

  // Check if room is available
  const { data: room } = await supabase
    .from('rooms')
    .select('id, is_occupied, room_number')
    .eq('id', room_id)
    .single()

  if (!room) {
    return { error: 'Room not found' }
  }

  if (room.is_occupied) {
    return { error: 'Room is already occupied' }
  }

  // Start transaction: update check-in request and create tenant
  try {
    // Update check-in request
    const { error: updateError } = await supabase
      .from('check_in_requests')
      .update({
        assigned_room_id: room_id,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', check_in_id)

    if (updateError) throw updateError

    // Mark room as occupied
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ is_occupied: true })
      .eq('id', room_id)

    if (roomError) throw roomError

    // Create tenant record
    const { data: checkInData } = await supabase
      .from('check_in_requests')
      .select('full_name, phone, email, id_card_number, id_card_photo_url, total_amount, deposit_amount, payment_method, payment_destination, payment_proof_url, selected_room_type, rental_duration, rental_days, rental_weeks, rental_months')
      .eq('id', check_in_id)
      .single()

    if (checkInData) {
      // Get check-in date from check_in_requests (created_at) or use current date
      const { data: checkInRequest } = await supabase
        .from('check_in_requests')
        .select('created_at')
        .eq('id', check_in_id)
        .single()
      
      const checkInDate = checkInRequest?.created_at 
        ? new Date(checkInRequest.created_at)
        : new Date()
      
      // Extract effective duration from selected_room_type if available
      let effectiveDuration = checkInData.rental_duration || 'daily'
      if (checkInData.selected_room_type) {
        try {
          const parsed = typeof checkInData.selected_room_type === 'string'
            ? JSON.parse(checkInData.selected_room_type)
            : checkInData.selected_room_type
          if (parsed?.rental_duration) {
            effectiveDuration = parsed.rental_duration
          }
        } catch (e) {}
      }

      // Calculate payment due date based on rental_duration and WIB cutoff time (12:00 WIB)
      const paymentDueDateStr = calculateCheckoutDueDate(
        checkInDate,
        effectiveDuration,
        checkInData.rental_days || 1,
        checkInData.rental_weeks || 1,
        checkInData.rental_months || 1
      )

      // Determine actual payment method
      const isCash = checkInData.payment_method === 'cash' || 
        checkInData.payment_destination?.toLowerCase().includes('cash') || 
        checkInData.payment_destination?.toLowerCase().includes('resepsionis') ||
        checkInData.payment_proof_url?.includes('placehold')

      const actualPaymentMethod = isCash ? 'cash' : 'transfer'

      // Create tenant record
      const rentalCount = effectiveDuration === 'monthly'
        ? (checkInData.rental_months || (checkInData.rental_days ? Math.round(checkInData.rental_days / 30) : 1))
        : (effectiveDuration === 'weekly'
          ? (checkInData.rental_weeks || (checkInData.rental_days ? Math.round(checkInData.rental_days / 7) : 1))
          : (effectiveDuration === 'transit_morning' ? 1 : (checkInData.rental_days || 1)))

      const tenantInsertPayload: any = {
        room_id: room_id,
        full_name: checkInData.full_name,
        id_card_url: checkInData.id_card_photo_url,
        check_in_date: getWIBDateString(checkInDate),
        payment_due_date: paymentDueDateStr,
        deposit_amount: checkInData.deposit_amount !== undefined && checkInData.deposit_amount !== null
          ? parseFloat(checkInData.deposit_amount)
          : 0,
        rental_duration: effectiveDuration,
        rental_count: rentalCount,
        electricity_meter_start: 0
      }

      let { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert(tenantInsertPayload)
        .select()
        .single()

      if (tenantError && (tenantError.message?.includes('rental_duration') || tenantError.message?.includes('check constraint'))) {
        tenantInsertPayload.rental_duration = 'daily'
        const retryTenant = await supabase
          .from('tenants')
          .insert(tenantInsertPayload)
          .select()
          .single()
        newTenant = retryTenant.data
        tenantError = retryTenant.error
      }

      if (tenantError) throw tenantError

      // Create payment record with confirmed status
      if (newTenant && checkInData.total_amount) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            tenant_id: newTenant.id,
            amount: checkInData.total_amount,
            payment_date: getWIBDateString(checkInDate),
            payment_method: actualPaymentMethod,
            status: 'confirmed',
            confirmed_by: user.id,
            confirmed_at: new Date().toISOString(),
            notes: `${isCash ? 'Pembayaran Tunai di Resepsionis' : 'Pembayaran QRIS GoPay Merchant'} | Tamu: ${checkInData.full_name} | Kamar: ${room.room_number || '-'}`
          })

        if (paymentError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error creating payment:', paymentError)
          }
        }
      }
    }

    revalidatePath('/dashboard/check-ins')
    revalidatePath('/dashboard/penghuni')
    revalidatePath('/dashboard/kamar')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to assign room' }
  }
}

/**
 * Delete a check-in request (only allowed for rejected or pending check-ins)
 */
export async function deleteCheckInRequest(check_in_id: string) {
  if (!check_in_id) return { error: 'ID check-in tidak valid' }

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
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner' && profile?.role !== 'staff') {
    return { error: 'Hanya owner atau staf yang dapat menghapus data' }
  }

  const { data: checkIn } = await supabase
    .from('check_in_requests')
    .select('id, branch_id, status')
    .eq('id', check_in_id)
    .single()

  if (!checkIn) {
    return { error: 'Data check-in tidak ditemukan' }
  }

  if (profile.role === 'staff' && checkIn.branch_id !== profile.branch_id) {
    return { error: 'Staf hanya dapat menghapus check-in di cabangnya sendiri' }
  }

  if (checkIn.status === 'completed') {
    return { error: 'Data check-in yang sudah selesai menjadi penghuni tidak dapat dihapus dari menu ini' }
  }

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : supabase

  const { error } = await adminClient
    .from('check_in_requests')
    .delete()
    .eq('id', check_in_id)

  if (error) {
    return { error: error.message || 'Gagal menghapus data check-in' }
  }

  revalidatePath('/dashboard/check-ins')
  return { success: true }
}

/**
 * Update reservation details (exclusive to Owner role)
 * Automatically recalculates total_amount and deposit_amount when guarantee_type changes.
 */
export async function updateCheckInRequest(prevState: any, formData: FormData) {
  const check_in_id = formData.get('check_in_id') as string
  const full_name = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const id_card_number = (formData.get('id_card_number') as string)?.trim()
  const guarantee_type = (formData.get('guarantee_type') as string) || 'deposit'

  if (!check_in_id) return { error: 'ID check-in tidak valid' }
  if (!full_name || full_name.length < 2) return { error: 'Nama lengkap minimal 2 karakter' }
  if (!phone || phone.length < 8) return { error: 'Nomor telepon tidak valid' }

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
    return { error: 'Hanya akun Owner yang memiliki wewenang mengubah rincian reservasi' }
  }

  // Fetch current check-in data to calculate exact deposit delta
  const { data: currentCheckIn, error: fetchErr } = await supabase
    .from('check_in_requests')
    .select('*')
    .eq('id', check_in_id)
    .single()

  if (fetchErr || !currentCheckIn) {
    return { error: 'Data reservasi tidak ditemukan' }
  }

  const currentDeposit = parseFloat(currentCheckIn.deposit_amount || '0')
  const currentTotal = parseFloat(currentCheckIn.total_amount || '0')

  // Calculate base room rental cost (total without deposit)
  const roomRentBase = Math.max(0, currentTotal - currentDeposit)

  let newDepositAmount = currentDeposit
  let newTotalAmount = currentTotal

  if (guarantee_type === 'deposit') {
    newDepositAmount = 100000
    newTotalAmount = roomRentBase + 100000
  } else if (guarantee_type === 'ktp') {
    newDepositAmount = 0
    newTotalAmount = roomRentBase // Deduct the deposit, preserving exact room rent
  }

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : supabase

  const { error: updateError } = await adminClient
    .from('check_in_requests')
    .update({
      full_name,
      phone,
      id_card_number: id_card_number || currentCheckIn.id_card_number,
      guarantee_type,
      deposit_amount: newDepositAmount.toString(),
      total_amount: newTotalAmount.toString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', check_in_id)

  if (updateError) {
    return { error: updateError.message || 'Gagal memperbarui data reservasi' }
  }

  revalidatePath('/dashboard/check-ins')
  return { 
    success: true, 
    updatedData: {
      id: check_in_id,
      full_name,
      phone,
      id_card_number: id_card_number || currentCheckIn.id_card_number,
      guarantee_type,
      deposit_amount: newDepositAmount.toString(),
      total_amount: newTotalAmount.toString()
    }
  }
}

