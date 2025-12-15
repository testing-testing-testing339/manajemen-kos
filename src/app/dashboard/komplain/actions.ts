'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createComplaint(prevState: any, formData: FormData) {
  const tenant_id = formData.get('tenant_id') as string
  const room_id = formData.get('room_id') as string
  const title = formData.get('title') as string
  const category = formData.get('category') as string
  const priority = formData.get('priority') as string
  const description = formData.get('description') as string

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
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Validate input
  if (!title || !description || !category || !priority) {
    return { error: 'Semua field wajib diisi' }
  }

  // Create ticket
  const { error } = await supabase
    .from('tickets')
    .insert({
      tenant_id,
      room_id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'open',
    })

  if (error) {
    console.error('Error creating ticket:', error)
    return { error: 'Gagal membuat komplain. Silakan coba lagi.' }
  }

  revalidatePath('/dashboard/komplain')
  return { success: true }
}

export async function updateTicketStatus(prevState: any, formData: FormData) {
  const ticket_id = formData.get('ticket_id') as string
  const status = formData.get('status') as string
  const resolution_notes = formData.get('resolution_notes') as string | null

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
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'in_progress') {
    updateData.assigned_to = user.id
    updateData.assigned_at = new Date().toISOString()
  }

  if (status === 'resolved' || status === 'closed') {
    updateData.resolved_by = user.id
    updateData.resolved_at = new Date().toISOString()
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes.trim()
    }
  }

  const { error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticket_id)

  if (error) {
    console.error('Error updating ticket:', error)
    return { error: 'Gagal memperbarui status tiket.' }
  }

  revalidatePath('/dashboard/komplain')
  return { success: true }
}

