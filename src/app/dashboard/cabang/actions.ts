'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function addBranch(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const address = formData.get('address') as string

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

  const { error } = await supabase.from('branches').insert({ name, address })

  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteBranch(prevState: any, formData: FormData) {
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

  const { error } = await supabase.from('branches').delete().eq('id', id)

  if (error) return { error: error.message }

  return { success: true }
}