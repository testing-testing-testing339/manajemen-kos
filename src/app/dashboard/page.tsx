import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  DoorClosed, 
  Users, 
  CreditCard, 
  UserCheck, 
  QrCode, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  PlusCircle
} from 'lucide-react'

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
          // No-op for server components
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, branch_id')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'staff'
  const isOwner = userRole === 'owner'

  // Fetch branches count
  let branchesQuery = supabase.from('branches').select('id, name', { count: 'exact' })
  if (profile?.branch_id && !isOwner) {
    branchesQuery = branchesQuery.eq('id', profile.branch_id)
  }
  const { data: branches, count: totalBranches } = await branchesQuery

  // Fetch rooms data
  let roomsQuery = supabase.from('rooms').select('id, room_number, is_occupied, floor_id, floors(id, name, branch_id)')
  if (profile?.branch_id && !isOwner) {
    roomsQuery = roomsQuery.eq('floors.branch_id', profile.branch_id)
  }
  const { data: rooms } = await roomsQuery

  const totalRooms = rooms?.length || 0
  const occupiedRooms = rooms?.filter(r => r.is_occupied === true).length || 0
  const availableRooms = totalRooms - occupiedRooms
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  // Fetch active tenants count
  let tenantsQuery = supabase.from('tenants').select('id, full_name, room_id, rooms(id, floor_id, floors(branch_id))', { count: 'exact' })
  if (profile?.branch_id && !isOwner) {
    tenantsQuery = tenantsQuery.eq('rooms.floors.branch_id', profile.branch_id)
  }
  const { count: totalTenants } = await tenantsQuery

  // Fetch pending check-ins count specifically
  let pendingCheckInsQuery = supabase
    .from('check_in_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (profile?.branch_id && !isOwner) {
    pendingCheckInsQuery = pendingCheckInsQuery.eq('branch_id', profile.branch_id)
  }
  const { count: pendingCheckIns } = await pendingCheckInsQuery

  // Fetch recent check-ins for the table
  let recentCheckInsQuery = supabase
    .from('check_in_requests')
    .select('id, full_name, phone, created_at, status, branch_id, total_amount')
  if (profile?.branch_id && !isOwner) {
    recentCheckInsQuery = recentCheckInsQuery.eq('branch_id', profile.branch_id)
  }
  const { data: recentCheckIns } = await recentCheckInsQuery
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch payments summary
  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, status, payment_date, payment_method, notes, tenant_id, tenants(full_name, rooms(room_number))')
    .order('created_at', { ascending: false })
    .limit(5)
  const { data: recentPayments } = await paymentsQuery

  const pendingPayments = recentPayments?.filter(p => p.status === 'pending')?.length || 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Aktif & Terhubung
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang, {profile?.full_name || user.email?.split('@')[0]}!
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-xl">
              Pantau hunian kos, status pembayaran sewa, dan permintaan check-in secara real-time dari satu tempat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/pembayaran"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 text-xs font-bold shadow-md hover:bg-indigo-50 transition-all hover:scale-102"
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Catat Pembayaran
            </Link>
            <Link
              href="/dashboard/qr-generator"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all hover:scale-102"
            >
              <QrCode className="w-4 h-4" />
              QR Check-in
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Kamar & Occupancy */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Okupansi Kamar
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{occupancyRate}%</span>
            <span className="text-xs font-semibold text-slate-400">
              ({occupiedRooms}/{totalRooms} Terisi)
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Penghuni Aktif */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Penghuni
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalTenants || 0}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Aktif
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {availableRooms} kamar kosong siap dihuni
          </p>
        </div>

        {/* Permintaan Check-In */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Check-in Masuk
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{pendingCheckIns || 0}</span>
            <span className="text-xs font-semibold text-amber-600">
              Permintaan
            </span>
          </div>
          <div className="mt-3">
            <Link 
              href="/dashboard/check-ins"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              Lihat Permintaan <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Total Kapasitas Kamar Graha Aisyah Menteng */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Kapasitas
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">53</span>
            <span className="text-xs font-semibold text-purple-600">
              Kamar
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="text-purple-600">13 VIP</span>
            <span>•</span>
            <span className="text-indigo-600">40 Non-VIP</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Aksi & Navigasi Cepat</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/dashboard/properti"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                Properti & Kamar
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Atur cabang, lantai, & tarif</p>
            </div>
          </Link>

          <Link
            href="/dashboard/penghuni"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                Daftar Penghuni
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Kelola penyewa & jatuh tempo</p>
            </div>
          </Link>

          <Link
            href="/dashboard/pembayaran"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                Pembayaran
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Verifikasi & cetak invoice</p>
            </div>
          </Link>

          <Link
            href="/dashboard/qr-generator"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-600 text-amber-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                QR Check-in
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Buat barcode check-in tamu</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Two Column Section: Recent Check-ins & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-In Requests */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Check-in Terbaru</h3>
              <p className="text-xs text-slate-400">Permintaan masuk dari tamu baru</p>
            </div>
            <Link
              href="/dashboard/check-ins"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {recentCheckIns && recentCheckIns.length > 0 ? (
              recentCheckIns.map((ci: any) => (
                <div 
                  key={ci.id} 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {ci.full_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ci.full_name}</p>
                      <p className="text-xs text-slate-400">{ci.phone || 'Tanpa no. hp'}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                    ci.status === 'approved' || ci.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : ci.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {ci.status === 'completed' ? 'Selesai' : ci.status === 'approved' ? 'Disetujui' : ci.status === 'rejected' ? 'Ditolak' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada permohonan check-in terbaru
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments Overview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pembayaran Terakhir</h3>
              <p className="text-xs text-slate-400">Transaksi sewa kamar terbaru</p>
            </div>
            <Link
              href="/dashboard/pembayaran"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((p: any) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      Rp
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {p.tenants?.full_name || 'Pembayaran Tamu'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.tenants?.rooms?.room_number ? `Kamar ${p.tenants.rooms.room_number} • ` : ''}{p.payment_method ? `Metode: ${p.payment_method}` : (p.notes || 'Transfer')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      Rp {Number(p.amount || 0).toLocaleString('id-ID')}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      p.status === 'confirmed' || p.status === 'verified' || p.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status === 'confirmed' ? 'Terkonfirmasi' : p.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada transaksi pembayaran
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}