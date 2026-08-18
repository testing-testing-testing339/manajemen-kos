import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import RoomList from './RoomList'

export default async function KamarPage() {
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

  const { data: roomsData } = await supabase.from('rooms').select('*, floors(name, branches(name))')
  const { data: floorsData } = await supabase.from('floors').select('*, branches(name)')

  return <RoomList initialRooms={roomsData || []} initialFloors={floorsData || []} />
}