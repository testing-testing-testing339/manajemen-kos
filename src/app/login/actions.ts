'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = ((formData.get('password') as string) || '').trim()

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' }
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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error for', email, error)
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email atau password salah. Silakan periksa kembali.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}