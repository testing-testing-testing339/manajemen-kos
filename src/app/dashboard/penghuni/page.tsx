import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TenantList from './TenantList'

export default async function PenghuniPage() {
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

  const { data: tenantsData } = await supabase.from('tenants').select('*, rooms(room_number, floors(branches(name)))')
  const { data: availableRoomsData } = await supabase.from('rooms').select('*, floors(branches(name))').eq('is_occupied', false)

  return <TenantList initialTenants={tenantsData || []} initialAvailableRooms={availableRoomsData || []} />
}