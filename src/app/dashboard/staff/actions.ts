'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createStaff(prevState: any, formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = ((formData.get('password') as string) || '').trim()
  const branch_id = formData.get('branch_id') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const notes = formData.get('notes') as string
  const photo = formData.get('photo') as File

  if (!email || !password || !full_name) {
    return { error: 'Nama lengkap, email, dan password wajib diisi' }
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

  // Check if user is owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat membuat akun staff' }
  }

  // Create auth user directly using service role
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return { error: 'Service role key not configured' }
    }

    // Create admin client with service role
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user using admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'staff'
      }
    })

    if (authError) {
      return { error: authError.message || 'Gagal membuat akun user' }
    }

    if (!authData?.user) {
      return { error: 'Gagal membuat user - tidak ada data user' }
    }

    // Upload photo if provided
    let photoUrl = null
    if (photo && photo.size > 0) {
      try {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from('staff-photos')
          .upload(filePath, photo, {
            cacheControl: '3600',
            upsert: false
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('staff-photos')
            .getPublicUrl(filePath)
          photoUrl = urlData.publicUrl
        }
      } catch (error) {
        console.error('Photo upload error:', error)
      }
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (existingProfile) {
      // Profile already exists, update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name,
          role: 'staff',
          branch_id,
          email: email,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
          photo_url: photoUrl,
          is_active: true,
        })
        .eq('id', authData.user.id)

      if (updateError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating existing profile:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          })
        }
        return { error: updateError.message || 'Failed to update staff profile.' }
      }
    } else {
      // Create new profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name,
        role: 'staff',
        branch_id,
        email: email, // Store email in profiles for easier access
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        photo_url: photoUrl,
        is_active: true,
      })

      if (profileError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating profile:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          })
        }
        
        // If profile creation fails, try to delete the auth user
        try {
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const adminClient = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
            )
            await adminClient.auth.admin.deleteUser(authData.user.id)
          }
        } catch (error) {
          // Silently handle cleanup errors
        }
        return { error: profileError.message || 'Failed to create staff profile. Please check RLS policies.' }
      }
    }

    revalidatePath('/dashboard/staff')
    return { success: true }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error in createStaff:', error)
    }
    return { error: error?.message || 'An unexpected error occurred while creating staff' }
  }
}

export async function updateStaff(prevState: any, formData: FormData) {
  const staff_id = formData.get('staff_id') as string
  const full_name = (formData.get('full_name') as string)?.trim()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const branch_id = formData.get('branch_id') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const notes = formData.get('notes') as string
  const is_active = formData.get('is_active') === 'on'
  const photo = formData.get('photo') as File

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

  // Check if user is owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat mengubah data staff' }
  }

  // Upload new photo if provided
  let photoUrl = null
  if (photo && photo.size > 0) {
    try {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${staff_id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('staff-photos')
        .upload(filePath, photo, {
          cacheControl: '3600',
          upsert: false
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('staff-photos')
          .getPublicUrl(filePath)
        photoUrl = urlData.publicUrl
      }
    } catch (error) {
      console.error('Photo upload error:', error)
    }
  }

  // Update profile
  const updateData: any = {
    full_name,
    branch_id,
    phone: phone || null,
    address: address || null,
    notes: notes || null,
    is_active,
  }

  if (email) {
    updateData.email = email
  }

  if (photoUrl) {
    updateData.photo_url = photoUrl
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', staff_id)

  if (updateError) return { error: updateError.message }

  // If email was provided/updated, sync with auth.users
  if (email && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      await adminClient.auth.admin.updateUserById(staff_id, {
        email,
        email_confirm: true
      })
    } catch (authSyncErr) {
      console.error('Auth email sync error:', authSyncErr)
    }
  }

  revalidatePath('/dashboard/staff')
  return { success: true }
}

export async function deleteStaff(prevState: any, formData: FormData) {
  const staff_id = formData.get('staff_id') as string

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

  // Check if user is owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat menghapus staff' }
  }

  // Delete profile first
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', staff_id)

  if (deleteError) return { error: deleteError.message }

  // Delete auth user using service role directly
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      await adminClient.auth.admin.deleteUser(staff_id)
    } catch (error) {
      console.error('Error deleting auth user:', error)
    }
  }

  revalidatePath('/dashboard/staff')
  return { success: true }
}

export async function changeStaffPassword(prevState: any, formData: FormData) {
  const staff_id = formData.get('staff_id') as string
  const new_password = ((formData.get('new_password') as string) || '').trim()
  const confirm_password = ((formData.get('confirm_password') as string) || '').trim()

  if (!staff_id || !new_password || !confirm_password) {
    return { error: 'Semua field harus diisi' }
  }

  if (new_password.length < 6) {
    return { error: 'Password harus minimal 6 karakter' }
  }

  if (new_password !== confirm_password) {
    return { error: 'Password dan konfirmasi password tidak cocok' }
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

  // Check if user is owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat mengubah password staff' }
  }

  // Verify staff exists and is a staff member
  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', staff_id)
    .single()

  if (!staffProfile) {
    return { error: 'Staff tidak ditemukan' }
  }

  if (staffProfile.role !== 'staff') {
    return { error: 'Hanya bisa mengubah password untuk staff' }
  }

  // Change password using service role (admin API)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Service role key tidak dikonfigurasi' }
  }

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const emailToSync = staffProfile.email ? staffProfile.email.trim().toLowerCase() : undefined

    let { error: updateError } = await adminClient.auth.admin.updateUserById(
      staff_id,
      {
        password: new_password,
        ...(emailToSync ? { email: emailToSync } : {}),
        email_confirm: true
      }
    )

    // If user was not in auth.users, create it directly
    if (updateError && (updateError.message?.toLowerCase().includes('not found') || (updateError as any).status === 404)) {
      if (emailToSync) {
        const { error: createError } = await adminClient.auth.admin.createUser({
          id: staff_id,
          email: emailToSync,
          password: new_password,
          email_confirm: true,
          user_metadata: {
            full_name: staffProfile.full_name,
            role: 'staff'
          }
        })
        if (!createError) {
          updateError = null
        } else {
          updateError = createError
        }
      }
    }

    if (updateError) {
      return { error: updateError.message || 'Gagal mengubah password' }
    }

    revalidatePath('/dashboard/staff')
    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error in changeStaffPassword:', error)
    return { error: error?.message || 'Terjadi kesalahan saat mengubah password' }
  }
}

