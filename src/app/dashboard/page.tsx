import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, branch_id')
    .eq('id', user.id)
    .single()

  // Get user role and branch_id for filtering
  const userRole = profile?.role || null
  const userBranchId = profile?.branch_id || null

  // Get floors in staff's branch (needed for filtering rooms and tenants)
  let floorsData: any[] = []
  if (userRole === 'staff' && userBranchId) {
    const { data: floors } = await supabase
      .from('floors')
      .select('id')
      .eq('branch_id', userBranchId)
    floorsData = floors || []
  }

  // Build queries based on role
  let branchesQuery = supabase.from('branches').select('*', { count: 'exact', head: true })
  let floorsQuery = supabase.from('floors').select('*', { count: 'exact', head: true })
  let roomsQuery = supabase.from('rooms').select('*', { count: 'exact', head: true })
  let occupiedRoomsQuery = supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('is_occupied', true)
  let tenantsQuery = supabase.from('tenants').select('*', { count: 'exact', head: true })

  // Filter for staff
  if (userRole === 'staff' && userBranchId) {
    // Staff can only see their branch
    branchesQuery = branchesQuery.eq('id', userBranchId)
    
    // Staff can only see floors in their branch
    floorsQuery = floorsQuery.eq('branch_id', userBranchId)
    
    // Staff can only see rooms in their branch
    if (floorsData.length > 0) {
      const floorIds = floorsData.map(f => f.id)
      roomsQuery = roomsQuery.in('floor_id', floorIds)
      occupiedRoomsQuery = occupiedRoomsQuery.in('floor_id', floorIds)
      
      // Get room IDs for filtering tenants
      const { data: staffRooms } = await supabase
        .from('rooms')
        .select('id')
        .in('floor_id', floorIds)
      
      if (staffRooms && staffRooms.length > 0) {
        const roomIds = staffRooms.map(r => r.id)
        tenantsQuery = tenantsQuery.in('room_id', roomIds)
      } else {
        // No rooms in their branch, return empty
        tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
      }
    } else {
      // No floors in their branch, return empty
      roomsQuery = roomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
      occupiedRoomsQuery = occupiedRoomsQuery.eq('floor_id', '00000000-0000-0000-0000-000000000000')
      tenantsQuery = tenantsQuery.eq('room_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Optimize: Parallel fetch all statistics
  const [branchesCount, floorsCount, roomsCount, tenantsCount, occupiedRoomsCount] = await Promise.all([
    branchesQuery,
    floorsQuery,
    roomsQuery,
    tenantsQuery,
    occupiedRoomsQuery,
  ])

  // Get payments (handle case if table doesn't exist yet) - optimized with parallel queries
  let paymentsData: any[] = []
  try {
    if (userRole === 'staff' && userBranchId && floorsData.length > 0) {
      const floorIds = floorsData.map(f => f.id)
      const [staffRoomsResult, nullPaymentsResult] = await Promise.all([
        supabase.from('rooms').select('id').in('floor_id', floorIds),
        supabase.from('payments').select('amount, payment_date, tenant_id').is('tenant_id', null)
      ])
      
      const staffRooms = staffRoomsResult.data || []
      if (staffRooms.length > 0) {
        const roomIds = staffRooms.map(r => r.id)
        const staffTenantsResult = await supabase.from('tenants').select('id').in('room_id', roomIds)
        const tenantIds = staffTenantsResult.data?.map(t => t.id) || []
        
        if (tenantIds.length > 0) {
          const branchPaymentsResult = await supabase
            .from('payments')
            .select('amount, payment_date, tenant_id')
            .in('tenant_id', tenantIds)
          
          paymentsData = [
            ...(branchPaymentsResult.data || []),
            ...(nullPaymentsResult.data || [])
          ]
        } else {
          paymentsData = nullPaymentsResult.data || []
        }
      } else {
        paymentsData = nullPaymentsResult.data || []
      }
    } else {
      const { data } = await supabase.from('payments').select('amount, payment_date, tenant_id')
      paymentsData = data || []
    }
  } catch (error) {
    // Table might not exist yet, that's okay
    if (process.env.NODE_ENV === 'development') {
      console.log('Payments table might not exist yet')
    }
  }


  // Calculate financial statistics
  const totalRevenue = paymentsData.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
  const today = new Date()
  const monthlyRevenue = paymentsData.filter((p: any) => {
    const paymentDate = new Date(p.payment_date)
    return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear()
  }).reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)

  const stats = [
    {
      name: 'Cabang',
      value: branchesCount.count || 0,
      icon: '🏢',
      color: 'from-blue-500 to-blue-600',
      href: '/dashboard/cabang',
    },
    {
      name: 'Lantai',
      value: floorsCount.count || 0,
      icon: '🏗️',
      color: 'from-purple-500 to-purple-600',
      href: '/dashboard/lantai',
    },
    {
      name: 'Kamar',
      value: roomsCount.count || 0,
      icon: '🚪',
      color: 'from-indigo-500 to-indigo-600',
      href: '/dashboard/kamar',
    },
    {
      name: 'Penghuni',
      value: tenantsCount.count || 0,
      icon: '👥',
      color: 'from-pink-500 to-pink-600',
      href: '/dashboard/penghuni',
    },
    {
      name: 'Kamar Terisi',
      value: occupiedRoomsCount.count || 0,
      icon: '✅',
      color: 'from-green-500 to-green-600',
      href: '/dashboard/kamar',
    },
    {
      name: 'Kamar Kosong',
      value: (roomsCount.count || 0) - (occupiedRoomsCount.count || 0),
      icon: '🔄',
      color: 'from-orange-500 to-orange-600',
      href: '/dashboard/kamar',
    },
    {
      name: 'Total Pendapatan',
      value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalRevenue),
      icon: '💰',
      color: 'from-green-500 to-emerald-600',
      href: '/dashboard/pembayaran',
    },
    {
      name: 'Pendapatan Bulan Ini',
      value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(monthlyRevenue),
      icon: '📈',
      color: 'from-blue-500 to-cyan-600',
      href: '/dashboard/pembayaran',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-2xl font-bold">GA</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Graha Aisyah</h2>
              <p className="text-indigo-100 text-sm">Mainframe System</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            Selamat Datang, {profile?.full_name || user.email?.split('@')[0]}
          </h1>
          {profile?.role && (
            <p className="text-indigo-100 text-lg">
              <span className="font-semibold">Role:</span> {profile.role}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <a
            key={stat.name}
            href={stat.href}
            className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-indigo-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-lg`}>
                {stat.icon}
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.name}</h3>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/dashboard/cabang"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <span className="text-xl">🏢</span>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-indigo-600">Tambah Cabang</span>
          </a>
          <a
            href="/dashboard/lantai"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <span className="text-xl">🏗️</span>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-purple-600">Tambah Lantai</span>
          </a>
          <a
            href="/dashboard/kamar"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
              <span className="text-xl">🚪</span>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-indigo-600">Tambah Kamar</span>
          </a>
          <a
            href="/dashboard/penghuni"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-500 transition-colors">
              <span className="text-xl">👥</span>
            </div>
            <span className="font-medium text-gray-700 group-hover:text-pink-600">Check-in Penghuni</span>
          </a>
        </div>
      </div>
    </div>
  )
}