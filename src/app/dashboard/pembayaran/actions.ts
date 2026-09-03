'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getWIBDateString } from '@/lib/dateUtils'

export async function recordPayment(prevState: any, formData: FormData) {
  const tenant_id = formData.get('tenant_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const payment_date = formData.get('payment_date') as string
  const payment_method = formData.get('payment_method') as string
  const notes = formData.get('notes') as string

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

  // Check if payment already exists for this month (only confirmed ones)
  const paymentDate = new Date(payment_date)
  const currentMonth = paymentDate.getMonth()
  const currentYear = paymentDate.getFullYear()

  // Check if status column exists, if not, check all payments
  const { data: existingPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', tenant_id)
  
  // Filter confirmed payments if status column exists
  const confirmedPayments = existingPayments?.filter((p: any) => {
    // If status column doesn't exist, treat all as confirmed (backward compatibility)
    if (p.status === undefined || p.status === null) {
      return true
    }
    return p.status === 'confirmed'
  }) || []

  const hasPaidThisMonth = confirmedPayments.some((p: any) => {
    const pDate = new Date(p.payment_date)
    return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear
  })

  if (hasPaidThisMonth) {
    return { error: 'Pembayaran untuk bulan ini sudah dikonfirmasi' }
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Determine status: auto-confirm for owner/staff, pending for others
  const paymentStatus = (profile?.role === 'owner' || profile?.role === 'staff') ? 'confirmed' : 'pending'

  // Fetch tenant info to guarantee permanent snapshot of name and room number
  const { data: tenantInfo } = await supabase
    .from('tenants')
    .select('full_name, rooms(room_number)')
    .eq('id', tenant_id)
    .single()

  const guestName = tenantInfo?.full_name
  const roomNumber = (tenantInfo?.rooms as any)?.room_number || '-'

  let finalNotes = notes?.trim() || ''
  const hasTamu = finalNotes.includes('Tamu:')
  const hasKamar = finalNotes.includes('Kamar:')

  if (guestName) {
    const metaParts: string[] = []
    if (!hasTamu) metaParts.push(`Tamu: ${guestName}`)
    if (!hasKamar) metaParts.push(`Kamar: ${roomNumber}`)
    if (metaParts.length > 0) {
      finalNotes = finalNotes ? `${finalNotes} | ${metaParts.join(' | ')}` : metaParts.join(' | ')
    }
  }

  // Insert payment
  const { error: insertError } = await supabase.from('payments').insert({
    tenant_id,
    amount,
    payment_date,
    payment_method,
    notes: finalNotes || null,
    status: paymentStatus,
    ...(paymentStatus === 'confirmed' ? {
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString()
    } : {})
  })

  if (insertError) return { error: insertError.message }

  // If confirmed, update tenant's payment_due_date to next month
  if (paymentStatus === 'confirmed') {
    const paymentDate = new Date(payment_date)
    const nextDueDate = new Date(paymentDate)
    nextDueDate.setMonth(nextDueDate.getMonth() + 1)
    
    await supabase
      .from('tenants')
      .update({ payment_due_date: getWIBDateString(nextDueDate) })
      .eq('id', tenant_id)
  }

  revalidatePath('/dashboard/pembayaran')
  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function confirmPayment(prevState: any, formData: FormData) {
  const payment_id = formData.get('payment_id') as string

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

  // Get payment details
  const { data: payment } = await supabase
    .from('payments')
    .select('tenant_id, payment_date')
    .eq('id', payment_id)
    .single()

  if (!payment) {
    return { error: 'Pembayaran tidak ditemukan' }
  }

  // Update payment status to confirmed
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', payment_id)

  if (updateError) return { error: updateError.message }

  // Update tenant's payment_due_date to next month
  const paymentDate = new Date(payment.payment_date)
  const nextDueDate = new Date(paymentDate)
  nextDueDate.setMonth(nextDueDate.getMonth() + 1)
  
  await supabase
    .from('tenants')
    .update({ payment_due_date: getWIBDateString(nextDueDate) })
    .eq('id', payment.tenant_id)

  revalidatePath('/dashboard/pembayaran')
  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletePayment(prevState: any, formData: FormData) {
  const payment_id = formData.get('payment_id') as string

  if (!payment_id) {
    return { error: 'ID Pembayaran tidak ditemukan' }
  }

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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : supabase

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Akses Ditolak: Hanya Pemilik Kos (Owner) yang berwenang menghapus transaksi keuangan / pembayaran.' }
  }

  const { error: deleteError } = await adminClient
    .from('payments')
    .delete()
    .eq('id', payment_id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/dashboard/pembayaran')
  revalidatePath('/dashboard/penghuni')
  revalidatePath('/dashboard/riwayat-checkout')
  revalidatePath('/dashboard')

  return { success: true, message: 'Transaksi berhasil dihapus dari sistem.' }
}

