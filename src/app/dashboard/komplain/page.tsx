import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ComplaintForm from './ComplaintForm'
import TicketList from './TicketList'

export default async function KomplainPage() {
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
          // No-op
        },
      },
    }
  )

  // Get user profile to check role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, branch_id')
    .eq('id', user.id)
    .single()

  // Get tenant info if user is a tenant
  let tenant = null
  if (profile?.role === 'tenant') {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, full_name, room_id, rooms(room_number, floors(branches(name)))')
      .eq('user_id', user.id)
      .single()
    
    tenant = tenantData
  }

  // Get tickets based on role
  let ticketsQuery = supabase
    .from('tickets')
    .select(`
      *,
      tenants(full_name, rooms(room_number, floors(branches(name)))),
      rooms(room_number, floors(branches(name))),
      profiles!tickets_assigned_to_fkey(full_name),
      profiles!tickets_resolved_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (profile?.role === 'tenant' && tenant) {
    // Tenants can only see their own tickets
    ticketsQuery = ticketsQuery.eq('tenant_id', tenant.id)
  } else if (profile?.role === 'staff' && profile.branch_id) {
    // Staff can see tickets in their branch
    ticketsQuery = ticketsQuery
      .select(`
        *,
        tenants(full_name, rooms(room_number, floors(branches(name)))),
        rooms(room_number, floors(branches(name))),
        profiles!tickets_assigned_to_fkey(full_name),
        profiles!tickets_resolved_by_fkey(full_name),
        rooms!inner(floors!inner(branches!inner(id)))
      `)
      .eq('rooms.floors.branches.id', profile.branch_id)
  }
  // Owner can see all tickets (no filter)

  const { data: tickets } = await ticketsQuery

  // Get unread/open tickets count for badge
  const openTicketsCount = tickets?.filter((t: any) => 
    t.status === 'open' || t.status === 'in_progress'
  ).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistem Komplain</h1>
          <p className="text-gray-600 mt-1">
            {profile?.role === 'tenant' 
              ? 'Laporkan masalah dengan kamar Anda' 
              : 'Kelola tiket komplain dari penyewa'}
          </p>
        </div>
        {profile?.role === 'tenant' && tenant && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Kamar Anda</p>
            <p className="text-lg font-semibold text-gray-900">
              No. {tenant.rooms?.room_number} - {tenant.rooms?.floors?.branches?.name}
            </p>
          </div>
        )}
      </div>

      {profile?.role === 'tenant' && tenant && (
        <ComplaintForm tenant={tenant} />
      )}

      <TicketList 
        initialTickets={tickets || []} 
        userRole={profile?.role || null}
        openTicketsCount={openTicketsCount}
      />
    </div>
  )
}

