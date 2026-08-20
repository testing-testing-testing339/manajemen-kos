import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LogOut, User, Sparkles, Calendar } from 'lucide-react'

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
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const initials = displayName.substring(0, 2).toUpperCase()

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date())

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 shadow-xs">
      {/* Left side: Date & Status */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-600 text-xs font-medium border border-slate-200/50">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>{today}</span>
        </div>
      </div>

      {/* Right side: Profile & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-indigo-500/20">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {displayName}
            </p>
            <p className="text-[11px] text-indigo-600 font-medium capitalize">
              {profile?.role || 'Staff'}
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Keluar"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150 cursor-pointer border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    </header>
  )
}