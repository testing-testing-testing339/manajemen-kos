import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import BranchList from './BranchList'

export default async function CabangPage() {
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
          // No-op for server components - they cannot modify cookies
        },
      },
    }
  )

  const { data } = await supabase.from('branches').select('*').order('created_at', { ascending: true })

  return <BranchList initialBranches={data || []} />
}