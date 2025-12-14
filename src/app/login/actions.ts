'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateEmail, sanitizeString } from '@/lib/validation'

export async function login(prevState: any, formData: FormData) {
  const emailInput = formData.get('email') as string
  const passwordInput = formData.get('password') as string

  if (!emailInput || !passwordInput) {
    return { error: 'Email dan password harus diisi' }
  }

  // Sanitize and validate inputs to prevent SQL injection and XSS
  const emailValidation = validateEmail(emailInput.trim())
  
  if (!emailValidation.valid) {
    return { error: 'Format email tidak valid' }
  }

  const sanitizedEmail = emailValidation.sanitized

  // Password validation (basic checks)
  if (passwordInput.length < 6) {
    return { error: 'Password harus minimal 6 karakter' }
  }

  // Additional security: Check for suspicious patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i
  ]

  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi
  ]

  const hasSQLInjection = sqlInjectionPatterns.some(pattern => 
    pattern.test(sanitizedEmail) || pattern.test(passwordInput)
  )

  const hasXSS = xssPatterns.some(pattern => 
    pattern.test(sanitizedEmail) || pattern.test(passwordInput)
  )

  if (hasSQLInjection || hasXSS) {
    // Log suspicious activity (in production, you'd want to log this properly)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Suspicious login attempt detected')
    }
    return { error: 'Input tidak valid. Silakan coba lagi.' }
  }

  const email = sanitizedEmail
  const password = passwordInput // Password is handled by Supabase Auth (hashed)

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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}