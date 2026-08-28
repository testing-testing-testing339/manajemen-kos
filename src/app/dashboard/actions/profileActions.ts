'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { uploadImageToCloud } from '@/lib/cloudStorage'
import { sanitizeString } from '@/lib/validation'

async function getSupabaseClients() {
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminClient = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  return { supabase, adminClient }
}

/**
 * Update Profile Name
 */
export async function updateProfileName(prevState: any, formData: FormData) {
  const rawName = formData.get('full_name') as string
  const full_name = sanitizeString(rawName || '').trim()

  if (!full_name || full_name.length < 2) {
    return { error: 'Nama lengkap minimal 2 karakter' }
  }

  const { supabase, adminClient } = await getSupabaseClients()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized - Silakan login kembali' }
  }

  try {
    const { data: branch } = await adminClient.from('branches').select('id').limit(1).single()
    const branchId = branch?.id

    // 1. Upsert into profiles table so missing rows are handled
    const { error: dbError } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name,
        role: user.user_metadata?.role || 'owner',
        branch_id: branchId,
        is_active: true
      }, { onConflict: 'id' })

    if (dbError) {
      return { error: 'Gagal memperbarui nama di database: ' + dbError.message }
    }

    // 2. Update auth user metadata
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { 
          ...user.user_metadata,
          full_name 
        }
      })
    } else {
      await supabase.auth.updateUser({
        data: { full_name }
      })
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, newName: full_name, message: 'Nama profil berhasil diperbarui!' }
  } catch (err: any) {
    return { error: err?.message || 'Terjadi kesalahan saat memperbarui nama' }
  }
}

/**
 * Update Profile Photo (Avatar)
 */
export async function updateProfilePhoto(prevState: any, formData: FormData) {
  const photo = formData.get('photo') as File

  if (!photo || photo.size === 0) {
    return { error: 'File foto belum dipilih' }
  }

  if (photo.size > 15 * 1024 * 1024) {
    return { error: 'Ukuran foto maksimal 15 MB' }
  }

  const { supabase, adminClient } = await getSupabaseClients()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized - Silakan login kembali' }
  }

  try {
    // 1. Upload photo to Cloudinary (with Supabase fallback)
    const photoUrl = await uploadImageToCloud(photo, {
      folder: 'graha-aisyah/profiles',
      filenamePrefix: `avatar-${user.id}`,
      fallbackBucket: 'staff-photos'
    })

    if (!photoUrl) {
      return { error: 'Gagal mengunggah foto ke penyimpanan cloud' }
    }

    const { data: branch } = await adminClient.from('branches').select('id').limit(1).single()
    const branchId = branch?.id

    // 2. Upsert into profiles table
    const { error: dbError } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        photo_url: photoUrl,
        role: user.user_metadata?.role || 'owner',
        branch_id: branchId,
        is_active: true
      }, { onConflict: 'id' })

    if (dbError) {
      return { error: 'Gagal menyimpan URL foto: ' + dbError.message }
    }

    // 3. Update auth user metadata
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { 
          ...user.user_metadata,
          avatar_url: photoUrl 
        }
      })
    } else {
      await supabase.auth.updateUser({
        data: { avatar_url: photoUrl }
      })
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, photoUrl, message: 'Foto profil berhasil diperbarui!' }
  } catch (err: any) {
    return { error: err?.message || 'Terjadi kesalahan saat mengunggah foto profil' }
  }
}

/**
 * Change Account Password
 */
export async function changePassword(prevState: any, formData: FormData) {
  const newPassword = (formData.get('new_password') as string)?.trim()
  const confirmPassword = (formData.get('confirm_password') as string)?.trim()

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password baru minimal harus 6 karakter' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok' }
  }

  const { supabase } = await getSupabaseClients()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized - Silakan login kembali' }
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return { error: 'Gagal mengubah password: ' + error.message }
    }

    return { success: true, message: 'Password akun Anda berhasil diganti!' }
  } catch (err: any) {
    return { error: err?.message || 'Terjadi kesalahan saat mengganti password' }
  }
}
