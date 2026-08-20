import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PlnManager from './PlnManager'
import Forbidden from '@/components/Forbidden'

export default async function PlnPage() {
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
          // Server component
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return (
      <Forbidden 
        title="Akses Manajemen ID PLN Khusus Owner" 
        message="Hanya akun Pemilik Kost (Owner) yang memiliki wewenang untuk melihat dan mengubah Nomor ID Pelanggan PLN / Meteran Listrik kamar kos." 
      />
    )
  }

  // Fetch floors
  const { data: floors } = await supabase
    .from('floors')
    .select('id, name, branch_id, branches(name)')
    .order('name', { ascending: true })

  // Fetch all rooms with floors and branches
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, room_type, is_occupied, facilities, floors(id, name, branches(name))')
    .order('room_number', { ascending: true })

  return (
    <PlnManager
      initialRooms={rooms as any || []}
      floors={floors || []}
    />
  )
}
