'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

  const { error } = await supabase
    .from('check_in_requests')
    .update({
      status: 'approved',
      assigned_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', check_in_id)

  if (error) return { error: error.message }

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

  const { error } = await supabase
    .from('check_in_requests')
    .update({
      status: 'rejected',
      assigned_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', check_in_id)

  if (error) return { error: error.message }

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

  if (checkIn.status !== 'approved') {
    return { error: 'Check-in request must be approved first' }
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
    .select('id, is_occupied')
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
      .select('full_name, phone, email, id_card_number, id_card_photo_url, total_amount')
      .eq('id', check_in_id)
      .single()

    if (checkInData) {
      // Calculate payment due date (1 month from now)
      const paymentDueDate = new Date()
      paymentDueDate.setMonth(paymentDueDate.getMonth() + 1)

      // Create tenant record
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          room_id: room_id,
          full_name: checkInData.full_name,
          id_card_url: checkInData.id_card_photo_url,
          check_in_date: new Date().toISOString().split('T')[0],
          payment_due_date: paymentDueDate.toISOString().split('T')[0],
          electricity_meter_start: 0 // Default, bisa diubah nanti
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      // Create payment record with confirmed status
      if (newTenant && checkInData.total_amount) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            tenant_id: newTenant.id,
            amount: checkInData.total_amount,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'transfer',
            status: 'confirmed',
            confirmed_by: user.id,
            confirmed_at: new Date().toISOString(),
            notes: 'Pembayaran dari check-in request'
          })

        if (paymentError) {
          // Log error but don't fail the whole process
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

