import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LiveClock from './LiveClock'
import MobileMenuButton from './MobileMenuButton'
import UserProfileMenu from './UserProfileMenu'

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

export default async function Header() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op for Server Components - cookie modifications must happen in Server Actions
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, photo_url')
    .eq('id', user.id)
    .single()

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between border-b border-slate-200/80 shadow-xs">
      {/* Left side: Hamburger button on mobile + Live Date & Time */}
      <div className="flex items-center gap-2 sm:gap-3">
        <MobileMenuButton />
        <LiveClock />
      </div>

      {/* Right side: Profile with Name, Photo & Password Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        <UserProfileMenu 
          user={{ id: user.id, email: user.email }}
          profile={profile}
          logoutAction={logout}
        />
      </div>
    </header>
  )
}