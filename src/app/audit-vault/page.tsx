import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AuditVaultClient from './AuditVaultClient'

export const dynamic = 'force-dynamic'

export default async function AuditVaultPage() {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminClient = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  const startTime = Date.now()

  // High-performance single batch parallel query for deep investigation & audit logs
  const [
    tenantsRes,
    roomsRes,
    floorsRes,
    branchesRes,
    checkInsRes,
    paymentsRes,
    profilesRes,
    damagesRes,
  ] = await Promise.all([
    adminClient.from('tenants').select('*, rooms(room_number, room_type, floors(name, branches(name)))').order('created_at', { ascending: false }),
    adminClient.from('rooms').select('*, floors(name, branches(name))').order('room_number', { ascending: true }),
    adminClient.from('floors').select('*, branches(name)'),
    adminClient.from('branches').select('*'),
    adminClient.from('check_in_requests').select('*, rooms(room_number, room_type, floors(name, branches(name)))').order('created_at', { ascending: false }),
    adminClient.from('payments').select('*, tenants(full_name, rooms(room_number))').order('created_at', { ascending: false }),
    adminClient.from('profiles').select('*').order('role', { ascending: false }),
    adminClient.from('property_damages').select('*, rooms(room_number, floors(name))').order('created_at', { ascending: false }),
  ])

  const latencyMs = Date.now() - startTime

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <AuditVaultClient 
        latencyMs={latencyMs}
        tenants={tenantsRes.data || []}
        checkIns={checkInsRes.data || []}
        payments={paymentsRes.data || []}
        profiles={profilesRes.data || []}
        rooms={roomsRes.data || []}
        floors={floorsRes.data || []}
        branches={branchesRes.data || []}
        damages={damagesRes.data || []}
      />
    </div>
  )
}
