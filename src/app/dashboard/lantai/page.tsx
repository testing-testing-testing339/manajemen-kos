import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import FloorList from './FloorList'

export default async function LantaiPage() {
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

  const { data } = await supabase.from('floors').select('*, branches(name)')

  return <FloorList initialFloors={data || []} />
}