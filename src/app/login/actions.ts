'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateEmail, sanitizeString, escapeHtml } from '@/lib/validation'

/**
 * Enhanced sanitization for email to prevent SQL injection and XSS
 */
function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/[^\w@._-]/g, '') // Only allow alphanumeric, @, ., _, -
    .substring(0, 254) // Max email length
}

/**
 * Enhanced sanitization for password to prevent injection attacks
 */
function sanitizePassword(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 128) // Max reasonable password length
}

/**
 * Comprehensive SQL injection detection
 */
function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const sqlPatterns = [
    // SQL keywords
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SCRIPT|SCRIPT)\b/i,
    // SQL comments and operators
    /(--|;|\/\*|\*\/|#)/i,
    // SQL functions
    /(xp_|sp_|CAST|CONVERT|CHAR|VARCHAR|NVARCHAR)/i,
    // SQL injection patterns
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    // Union-based injection
    /UNION\s+(ALL\s+)?SELECT/i,
    // Time-based injection
    /(SLEEP|WAITFOR|DELAY|BENCHMARK)/i,
    // Boolean-based injection
    /(\d+\s*=\s*\d+|\d+\s*!=\s*\d+|\d+\s*<>\s*\d+)/i,
    // Stacked queries
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Comprehensive XSS detection
 */
function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const xssPatterns = [
    // Script tags
    /<script[^>]*>.*?<\/script>/gi,
    /<script/gi,
    // Event handlers
    /on\w+\s*=/gi,
    /onerror|onload|onclick|onmouseover/gi,
    // JavaScript protocol
    /javascript:/gi,
    /data:text\/html/gi,
    // Iframe and embed
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    // HTML entities used for XSS
    /&#x?[0-9a-f]+;/gi,
    // Expression injection
    /expression\s*\(/gi,
    // VBScript
    /vbscript:/gi,
    // CSS injection
    /<style[^>]*>.*?<\/style>/gi,
    // Base64 encoded payloads
    /data:image\/svg\+xml;base64/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

export async function login(prevState: any, formData: FormData) {
  const emailInput = formData.get('email') as string
  const passwordInput = formData.get('password') as string

  // Basic validation
  if (!emailInput || !passwordInput) {
    return { error: 'Email dan password harus diisi' }
  }

  // Sanitize inputs first
  const sanitizedEmail = sanitizeEmail(emailInput)
  const sanitizedPassword = sanitizePassword(passwordInput)

  // Validate email format
  const emailValidation = validateEmail(sanitizedEmail)
  if (!emailValidation.valid) {
    return { error: 'Format email tidak valid' }
  }

  // Additional email validation
  if (sanitizedEmail.length < 5 || sanitizedEmail.length > 254) {
    return { error: 'Format email tidak valid' }
  }

  // Password validation
  if (sanitizedPassword.length < 6) {
    return { error: 'Password harus minimal 6 karakter' }
  }

  if (sanitizedPassword.length > 128) {
    return { error: 'Password terlalu panjang' }
  }

  // Security checks: SQL Injection detection
  if (detectSQLInjection(sanitizedEmail) || detectSQLInjection(sanitizedPassword)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('SQL Injection attempt detected in login')
    }
    return { error: 'Input tidak valid. Silakan coba lagi.' }
  }

  // Security checks: XSS detection
  if (detectXSS(sanitizedEmail) || detectXSS(sanitizedPassword)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('XSS attempt detected in login')
    }
    return { error: 'Input tidak valid. Silakan coba lagi.' }
  }

  // Final sanitized values (Supabase Auth uses parameterized queries, but we sanitize anyway)
  const email = emailValidation.sanitized
  const password = sanitizedPassword // Supabase handles password hashing securely

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