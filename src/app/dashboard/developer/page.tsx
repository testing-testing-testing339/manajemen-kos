import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Forbidden from '@/components/Forbidden'
import DeveloperDashboard from './DeveloperDashboard'

export default async function DeveloperPage() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return (
      <Forbidden 
        title="Akses Monitoring Developer Khusus Owner" 
        message="Hanya akun Administrator / Pemilik Kos yang dapat mengakses panel pemantauan sistem dan database storage." 
      />
    )
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminClient = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

  const startTime = Date.now()

  // Parallel fetch row counts across tables
  const [
    tenantsCountRes,
    roomsCountRes,
    floorsCountRes,
    branchesCountRes,
    checkInsCountRes,
    paymentsCountRes,
    profilesCountRes,
    damagesCountRes,
    plnCountRes,
    authUsersRes,
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('floors').select('*', { count: 'exact', head: true }),
    supabase.from('branches').select('*', { count: 'exact', head: true }),
    supabase.from('check_in_requests').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('property_damages').select('*', { count: 'exact', head: true }),
    supabase.from('pln_tokens').select('*', { count: 'exact', head: true }),
    adminClient ? adminClient.auth.admin.listUsers() : Promise.resolve({ data: { users: [] } }),
  ])

  const latencyMs = Date.now() - startTime

  // Storage buckets stats
  let storageBuckets: any[] = []
  let totalStorageBytes = 0
  let totalStorageFiles = 0

  if (serviceRoleKey) {
    try {
      const bRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      })
      const buckets = await bRes.json()
      if (Array.isArray(buckets)) {
        for (const b of buckets) {
          try {
            const fRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/list/${b.name}`, {
              method: 'POST',
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prefix: '', limit: 500 }),
            })
            const files = await fRes.json()
            if (Array.isArray(files)) {
              const bucketBytes = files.reduce((acc: number, f: any) => acc + (f.metadata?.size || 0), 0)
              totalStorageBytes += bucketBytes
              totalStorageFiles += files.length
              storageBuckets.push({
                name: b.name,
                public: Boolean(b.public),
                fileCount: files.length,
                totalBytes: bucketBytes,
                createdAt: b.created_at || new Date().toISOString(),
                files: files.slice(0, 15).map((f: any) => ({
                  name: f.name,
                  size: f.metadata?.size || 0,
                  mimetype: f.metadata?.mimetype || 'image/jpeg',
                  updatedAt: f.updated_at || f.created_at || new Date().toISOString(),
                })),
              })
            }
          } catch (e) {
            console.error(`Error reading bucket ${b.name}:`, e)
          }
        }
      }
    } catch (e) {
      console.error('Error fetching buckets:', e)
    }
  }

  // Calculate table metrics
  const tables = [
    { name: 'check_in_requests', label: 'Permintaan Check-In & Tamu', count: checkInsCountRes.count ?? 0, estimatedBytesPerRow: 1200 },
    { name: 'payments', label: 'Transaksi Pembayaran Kas & Sewa', count: paymentsCountRes.count ?? 0, estimatedBytesPerRow: 800 },
    { name: 'tenants', label: 'Data Penghuni Aktif', count: tenantsCountRes.count ?? 0, estimatedBytesPerRow: 600 },
    { name: 'rooms', label: 'Unit Kamar Kos', count: roomsCountRes.count ?? 0, estimatedBytesPerRow: 400 },
    { name: 'floors', label: 'Lantai Bangunan', count: floorsCountRes.count ?? 0, estimatedBytesPerRow: 250 },
    { name: 'branches', label: 'Cabang Kos', count: branchesCountRes.count ?? 0, estimatedBytesPerRow: 350 },
    { name: 'profiles', label: 'Profil Pengguna & Staf', count: profilesCountRes.count ?? 0, estimatedBytesPerRow: 500 },
    { name: 'property_damages', label: 'Laporan Kerusakan & Aset', count: (damagesCountRes as any)?.count ?? 0, estimatedBytesPerRow: 700 },
    { name: 'pln_tokens', label: 'Catatan Meteran PLN', count: (plnCountRes as any)?.count ?? 0, estimatedBytesPerRow: 300 },
  ]

  const totalDbRows = tables.reduce((acc, t) => acc + t.count, 0)
  const totalEstimatedDbBytes = tables.reduce((acc, t) => acc + (t.count * t.estimatedBytesPerRow), 0) + (1024 * 1024 * 2) // Base DB catalog overhead ~2MB

  return (
    <DeveloperDashboard 
      latencyMs={latencyMs}
      totalDbRows={totalDbRows}
      totalEstimatedDbBytes={totalEstimatedDbBytes}
      totalStorageBytes={totalStorageBytes}
      totalStorageFiles={totalStorageFiles}
      storageBuckets={storageBuckets}
      tables={tables}
      authUsersCount={authUsersRes.data?.users?.length || 0}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
    />
  )
}
