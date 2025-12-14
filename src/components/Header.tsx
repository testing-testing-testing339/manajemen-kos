import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function logout() {
  'use server'

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

  await supabase.auth.signOut()
  redirect('/login')
}

export { logout }

export default async function Header() {
  const cookieStore = await cookies()

  // Create a read-only Supabase client for Server Components
  // We can't modify cookies in Server Components, only in Server Actions
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op: Can't modify cookies in Server Components
          // Session refresh will be handled in Server Actions if needed
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  
  // Only log errors in development mode if they have meaningful information
  if (profileError && process.env.NODE_ENV === 'development') {
    const errorCode = profileError.code
    const errorMessage = profileError.message
    const hasErrorInfo = Boolean(
      (errorCode && String(errorCode).trim()) ||
      (errorMessage && String(errorMessage).trim())
    )
    if (hasErrorInfo) {
      console.error('Header - Error fetching profile:', {
        code: errorCode,
        message: errorMessage,
        userId: user.id
      })
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Graha Aisyah
          </h1>
          <p className="text-xs text-gray-500">Mainframe System</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{profile?.full_name || user.email?.split('@')[0]}</p>
              {profile?.role && (
                <p className="text-xs text-gray-500">{profile.role}</p>
              )}
            </div>
          </div>
          <form action={logout}>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}