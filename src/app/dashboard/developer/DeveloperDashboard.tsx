'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Database, 
  HardDrive, 
  Users, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Wrench, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Server,
  FolderArchive,
  Image as ImageIcon,
  Cpu,
  ArrowUpRight,
  Info,
  Building2,
  Lock,
  Unlock,
  KeyRound,
  Search,
  UserCheck,
  UserX,
  CreditCard,
  Clock,
  Calendar,
  Phone,
  AlertTriangle,
  Receipt,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Check,
  X
} from 'lucide-react'

interface TableMetric {
  name: string
  label: string
  count: number
  estimatedBytesPerRow: number
}

interface StorageBucket {
  name: string
  public: boolean
  fileCount: number
  totalBytes: number
  createdAt: string
  files: Array<{
    name: string
    size: number
    mimetype: string
    updatedAt: string
  }>
}

interface DeveloperDashboardProps {
  latencyMs: number
  totalDbRows: number
  totalEstimatedDbBytes: number
  totalStorageBytes: number
  totalStorageFiles: number
  storageBuckets: StorageBucket[]
  tables: TableMetric[]
  authUsersCount: number
  supabaseUrl: string
  tenants: any[]
  checkIns: any[]
  payments: any[]
  profiles: any[]
  rooms: any[]
  floors: any[]
  branches: any[]
}

export default function DeveloperDashboard({
  latencyMs: initialLatency,
  totalDbRows,
  totalEstimatedDbBytes,
  totalStorageBytes,
  totalStorageFiles,
  storageBuckets,
  tables,
  authUsersCount,
  supabaseUrl,
  tenants,
  checkIns,
  payments,
  profiles,
  rooms,
  floors,
  branches
}: DeveloperDashboardProps) {
  // Master Password Gate State
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [activeTab, setActiveTab] = useState<'investigator' | 'audit_logs' | 'database_metrics'>('investigator')

  // Investigator Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'checked_out'>('all')
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null)

  // Audit Logs State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')

  // Storage / Latency State
  const [latency, setLatency] = useState(initialLatency)
  const [isPinging, setIsPinging] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState<StorageBucket | null>(storageBuckets[0] || null)

  // Image Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState<string>('')

  // Check session storage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dev_vault_unlocked')
      if (saved === 'sparkplug') {
        setIsUnlocked(true)
      }
    } catch {}
  }, [])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput.trim().toLowerCase() === 'sparkplug') {
      setIsUnlocked(true)
      setPasswordError(false)
      try {
        sessionStorage.setItem('dev_vault_unlocked', 'sparkplug')
      } catch {}
    } else {
      setPasswordError(true)
    }
  }

  const handleLock = () => {
    setIsUnlocked(false)
    setPasswordInput('')
    try {
      sessionStorage.removeItem('dev_vault_unlocked')
    } catch {}
  }

  // Latency ping
  const handlePing = async () => {
    setIsPinging(true)
    const start = performance.now()
    try {
      const res = await fetch('/api/keep-alive')
      if (res.ok) {
        setLatency(Math.round(performance.now() - start))
      }
    } catch {
      setLatency(Math.round(performance.now() - start))
    } finally {
      setIsPinging(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  // Profile Map
  const profileMap = useMemo(() => {
    return new Map(profiles.map(p => [p.id, p]))
  }, [profiles])

  // Compile Comprehensive Guests & Tenants List for Deep Investigation
  const allGuests = useMemo(() => {
    const activeTenantIds = new Set(tenants.map(t => t.id))
    const activeRoomIds = new Set(tenants.map(t => t.room_id).filter(Boolean))
    const activeNames = new Set(tenants.map(t => (t.full_name || '').toLowerCase().trim()))

    const guestList: any[] = []

    // 1. Process active tenants
    tenants.forEach(t => {
      const room = t.rooms || {}
      const floor = room?.floors || {}
      const branch = floor?.branches || {}

      // Find matching check-in request
      const matchedCIR = checkIns.find(c => 
        (c.assigned_room_id === t.room_id) || 
        ((c.full_name || '').toLowerCase().trim() === (t.full_name || '').toLowerCase().trim())
      )

      // Find all payments for this tenant
      const tenantPayments = payments.filter(p => 
        p.tenant_id === t.id || 
        (matchedCIR && (p.notes || '').toLowerCase().includes((t.full_name || '').toLowerCase()))
      )

      guestList.push({
        id: t.id,
        is_active: true,
        full_name: t.full_name,
        phone: t.phone || matchedCIR?.phone || '-',
        email: matchedCIR?.email || '-',
        nik: t.id_card_number || matchedCIR?.id_card_number || '-',
        room_number: room?.room_number || '-',
        room_type: room?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
        floor_name: floor?.name || '-',
        branch_name: branch?.name || 'Graha Aisyah Menteng',
        rental_duration: t.rental_duration || matchedCIR?.rental_duration || 'daily',
        rental_count: t.rental_count || 1,
        check_in_date: t.check_in_date || matchedCIR?.created_at,
        payment_due_date: t.payment_due_date,
        deposit_amount: parseFloat(t.deposit_amount || matchedCIR?.deposit_amount || 0),
        id_card_photo_url: t.id_card_photo_url || matchedCIR?.id_card_photo_url,
        selfie_photo_url: t.selfie_photo_url || matchedCIR?.selfie_photo_url,
        payment_proof_url: matchedCIR?.payment_proof_url || tenantPayments[0]?.payment_proof_url,
        check_in_assigned_by: matchedCIR?.assigned_by ? (profileMap.get(matchedCIR.assigned_by)?.full_name || 'Staff') : 'Staff',
        payments: tenantPayments,
        raw_cir: matchedCIR,
        raw_tenant: t,
        created_at: t.created_at
      })
    })

    // 2. Process checked-out guests from check_in_requests
    checkIns.forEach(c => {
      const cName = (c.full_name || '').toLowerCase().trim()
      const isAlreadyActive = activeNames.has(cName)

      if (!isAlreadyActive) {
        const room = c.rooms || {}
        const floor = room?.floors || {}
        const branch = floor?.branches || {}

        // Find payments
        const guestPayments = payments.filter(p => 
          (p.notes || '').toLowerCase().includes(cName) || 
          (room?.room_number && (p.notes || '').toLowerCase().includes(`kamar: ${room.room_number}`))
        )

        // Find checkout settlement payment if any
        const checkoutPayment = guestPayments.find(p => (p.notes || '').includes('[Pelunasan Check-Out]') || (p.notes || '').includes('[Klaim Deposit]'))

        const staffWhoCheckedOut = checkoutPayment?.confirmed_by 
          ? (profileMap.get(checkoutPayment.confirmed_by)?.full_name || 'Staff')
          : (c.assigned_by ? (profileMap.get(c.assigned_by)?.full_name || 'Staff') : 'Staff')

        guestList.push({
          id: c.id,
          is_active: false,
          full_name: c.full_name,
          phone: c.phone || '-',
          email: c.email || '-',
          nik: c.id_card_number || '-',
          room_number: room?.room_number || '-',
          room_type: room?.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room',
          floor_name: floor?.name || '-',
          branch_name: branch?.name || 'Graha Aisyah Menteng',
          rental_duration: c.rental_duration || 'daily',
          rental_count: c.rental_days || c.rental_weeks || c.rental_months || 1,
          check_in_date: c.created_at,
          checkout_date: checkoutPayment?.created_at || c.updated_at || c.created_at,
          payment_due_date: null,
          deposit_amount: parseFloat(c.deposit_amount || 0),
          id_card_photo_url: c.id_card_photo_url,
          selfie_photo_url: c.selfie_photo_url,
          payment_proof_url: c.payment_proof_url || guestPayments[0]?.payment_proof_url,
          check_in_assigned_by: c.assigned_by ? (profileMap.get(c.assigned_by)?.full_name || 'Staff') : 'Staff',
          checkout_processed_by: staffWhoCheckedOut,
          checkout_notes: checkoutPayment?.notes || 'Check-out Selesai Diproses',
          payments: guestPayments,
          raw_cir: c,
          raw_tenant: null,
          created_at: c.created_at
        })
      }
    })

    return guestList
  }, [tenants, checkIns, payments, profileMap])

  // Filtered Guests
  const filteredGuests = useMemo(() => {
    return allGuests.filter(g => {
      if (statusFilter === 'active' && !g.is_active) return false
      if (statusFilter === 'checked_out' && g.is_active) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        g.full_name?.toLowerCase().includes(q) ||
        g.phone?.includes(q) ||
        g.nik?.includes(q) ||
        g.room_number?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q)
      )
    })
  }, [allGuests, statusFilter, searchQuery])

  // Audit Logs per Staff Account
  const staffMetrics = useMemo(() => {
    return profiles.map(p => {
      // Check-ins assigned
      const assignedCheckIns = checkIns.filter(c => c.assigned_by === p.id)
      
      // Payments confirmed
      const confirmedPayments = payments.filter(pay => pay.confirmed_by === p.id)
      const totalMoneyHandled = confirmedPayments.reduce((acc, pay) => acc + (parseFloat(pay.amount) || 0), 0)

      // Checkouts handled
      const checkoutsHandled = payments.filter(pay => 
        pay.confirmed_by === p.id && 
        ((pay.notes || '').includes('[Pelunasan Check-Out]') || (pay.notes || '').includes('[Klaim Deposit]'))
      )

      return {
        profile: p,
        assignedCheckInsCount: assignedCheckIns.length,
        confirmedPaymentsCount: confirmedPayments.length,
        totalMoneyHandled,
        checkoutsHandledCount: checkoutsHandled.length,
        recentPayments: confirmedPayments.slice(0, 5),
        recentCheckIns: assignedCheckIns.slice(0, 5)
      }
    })
  }, [profiles, checkIns, payments])

  // Combined Audit Timeline Feed
  const auditTimeline = useMemo(() => {
    const events: any[] = []

    // 1. Payment events
    payments.forEach(pay => {
      const staff = profileMap.get(pay.confirmed_by)
      events.push({
        type: pay.notes?.includes('[Pelunasan Check-Out]') 
          ? 'checkout_settlement'
          : pay.notes?.includes('[Klaim Deposit]')
          ? 'deposit_claim'
          : 'payment_verified',
        timestamp: pay.created_at || pay.payment_date,
        staffName: staff?.full_name || 'Staff',
        staffRole: staff?.role || 'staff',
        title: pay.notes?.includes('[Pelunasan Check-Out]')
          ? `Pelunasan Denda Check-out: ${formatRupiah(parseFloat(pay.amount))}`
          : pay.notes?.includes('[Klaim Deposit]')
          ? `Klaim Deposit Selesai: ${formatRupiah(parseFloat(pay.amount))}`
          : `Verifikasi Pembayaran Sewa: ${formatRupiah(parseFloat(pay.amount))}`,
        description: pay.notes || `Metode: ${pay.payment_method?.toUpperCase()}`,
        amount: parseFloat(pay.amount) || 0,
        staffId: pay.confirmed_by
      })
    })

    // 2. Check-in assignments
    checkIns.forEach(c => {
      if (c.assigned_by) {
        const staff = profileMap.get(c.assigned_by)
        events.push({
          type: 'check_in_assigned',
          timestamp: c.assigned_at || c.updated_at || c.created_at,
          staffName: staff?.full_name || 'Staff',
          staffRole: staff?.role || 'staff',
          title: `Assign Kamar Tamu: ${c.full_name}`,
          description: `Kamar ${c.rooms?.room_number || '-'} (${c.rental_duration || 'daily'}) • Total Tagihan: ${formatRupiah(parseFloat(c.total_amount || 0))}`,
          amount: parseFloat(c.total_amount || 0),
          staffId: c.assigned_by
        })
      }
    })

    // Sort descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (selectedStaffId === 'all') return events
    return events.filter(e => e.staffId === selectedStaffId)
  }, [payments, checkIns, profileMap, selectedStaffId])

  // If locked, render the Master Developer Password Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-[10px] font-mono text-indigo-300 tracking-wider uppercase mb-2">
                🔒 Restricted Developer Vault
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Graha System Inspector
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Panel investigasi forensik penghuni dan audit log aktivitas akun staf & owner.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="w-full space-y-4 pt-2">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Master Developer Key
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value)
                      setPasswordError(false)
                    }}
                    placeholder="Masukkan sandi..."
                    autoFocus
                    className={`w-full px-4 py-3 bg-slate-950 border ${
                      passwordError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    } rounded-xl text-white font-mono text-sm placeholder-slate-600 outline-hidden transition-all pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Kata sandi tidak cocok. Silakan coba lagi.</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Akses Konsol</span>
              </button>
            </form>

            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Database Safe • Zero Heavy Query Load
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono uppercase tracking-wider">
              Developer & Inspector Vault
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Console Unlocked
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Sistem Investigasi & Audit Aktivitas</span>
          </h1>
          <p className="text-xs text-slate-400">
            Dossier forensik tamu/penghuni, audit jejak petugas, dan pemantauan resource database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePing}
            disabled={isPinging}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isPinging ? 'animate-spin' : ''}`} />
            <span>Latensi DB ({latency} ms)</span>
          </button>

          <button
            type="button"
            onClick={handleLock}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Panel</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('investigator')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'investigator'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Search className="w-4 h-4 text-indigo-600" />
          <span>Investigasi Penghuni & Tamu</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
            {allGuests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Activity className="w-4 h-4 text-purple-600" />
          <span>Audit Log Aktivitas Akun</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-50 text-purple-700 font-bold border border-purple-100">
            {profiles.length} Akun
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database_metrics')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'database_metrics'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4 text-blue-600" />
          <span>Kapasitas Database & Kuota</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INVESTIGASI FORENSIK PENGHUNI & TAMU
          ========================================================================= */}
      {activeTab === 'investigator' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama Tamu, No. WhatsApp, NIK KTP, atau Nomor Kamar..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({allGuests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Penghuni Aktif ({allGuests.filter(g => g.is_active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('checked_out')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'checked_out'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Riwayat Check-out ({allGuests.filter(g => !g.is_active).length})
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuests.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Data tamu tidak ditemukan</p>
                <p className="text-xs text-slate-400 mt-0.5">Coba kata kunci pencarian nama atau NIK yang lain</p>
              </div>
            ) : (
              filteredGuests.map(guest => {
                const hasKtp = Boolean(guest.id_card_photo_url)
                const hasSelfie = Boolean(guest.selfie_photo_url)
                const hasProof = Boolean(guest.payment_proof_url && !guest.payment_proof_url.includes('placehold'))

                return (
                  <div
                    key={guest.id}
                    onClick={() => setSelectedGuest(guest)}
                    className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3.5 group relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          guest.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {guest.is_active ? <UserCheck className="w-3 h-3 text-emerald-600" /> : <UserX className="w-3 h-3 text-slate-400" />}
                          <span>{guest.is_active ? 'Penghuni Aktif' : 'Sudah Check-out'}</span>
                        </span>

                        <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                          Kamar {guest.room_number}
                        </span>
                      </div>

                      {/* Guest Info */}
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                        {guest.full_name}
                      </h3>
                      <div className="text-xs text-slate-500 space-y-1 mt-1 font-medium">
                        <p className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{guest.phone || '-'}</span>
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-mono">NIK: {guest.nik || '-'}</span>
                        </p>
                      </div>

                      {/* Photo Thumbnail Badges */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasKtp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                        }`}>
                          🪪 {hasKtp ? 'KTP Ada' : 'Tanpa KTP'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasSelfie ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                        }`}>
                          👤 {hasSelfie ? 'Selfie Ada' : 'Tanpa Selfie'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasProof ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          🧾 {hasProof ? 'Struk Ada' : 'Tunai'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Buka Dossier Forensik</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUDIT LOG AKTIVITAS AKUN
          ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-6">
          {/* Staff Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {staffMetrics.map(m => {
              const isSelected = selectedStaffId === m.profile.id

              return (
                <div
                  key={m.profile.id}
                  onClick={() => setSelectedStaffId(isSelected ? 'all' : m.profile.id)}
                  className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer space-y-4 relative ${
                    isSelected 
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        m.profile.role === 'owner'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {m.profile.role?.toUpperCase()}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                        {m.profile.full_name || 'Staff User'}
                      </h3>
                      <p className="text-xs text-slate-400">{m.profile.email}</p>
                    </div>

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 block">Check-In</span>
                      <span className="text-sm font-black text-slate-800">{m.assignedCheckInsCount}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 block">Bayar Sah</span>
                      <span className="text-sm font-black text-emerald-600">{m.confirmedPaymentsCount}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 block">Check-Out</span>
                      <span className="text-sm font-black text-indigo-600">{m.checkoutsHandledCount}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">Total Uang Diproses:</span>
                    <span className="font-mono font-black text-xs text-emerald-700">{formatRupiah(m.totalMoneyHandled)}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-bold text-center">
                    {isSelected ? '✓ Filter timeline aktif' : 'Klik untuk filter timeline'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Timeline Stream */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Jejak Audit Aktivitas Petugas
                </h3>
                <p className="text-xs text-slate-500">
                  Kronologi seluruh tindakan check-in, verifikasi kas/bayar, dan check-out
                </p>
              </div>

              {selectedStaffId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffId('all')}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  Tampilkan Semua Akun
                </button>
              )}
            </div>

            <div className="space-y-3">
              {auditTimeline.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada jejak aktivitas tercatat.</p>
              ) : (
                auditTimeline.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      {ev.type.includes('payment') ? <Receipt className="w-4 h-4 text-emerald-600" /> : <UserCheck className="w-4 h-4 text-indigo-600" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-xs">{ev.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(ev.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{ev.description}</p>
                      <p className="text-[10px] text-indigo-600 font-bold">
                        Petugas: <strong className="text-slate-800">{ev.staffName}</strong> ({ev.staffRole})
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DATABASE & STORAGE METRICS
          ========================================================================= */}
      {activeTab === 'database_metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Baris Database</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalDbRows.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">Estimasi Ukuran: <strong>{formatBytes(totalEstimatedDbBytes)}</strong> / 500 MB Free Quota</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Supabase File Storage</span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">{totalStorageFiles} File</p>
              <p className="text-[11px] text-slate-500">Total Ukuran: <strong>{formatBytes(totalStorageBytes)}</strong> / 1 GB Free Quota</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Latensi Respon Database</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{latency} ms</p>
              <p className="text-[11px] text-emerald-700 font-bold">✓ Sangat Cepat & Optimal</p>
            </div>
          </div>

          {/* Table Details */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm">Rincian Jumlah Baris Tiap Tabel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tables.map(t => (
                <div key={t.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-900">{t.label}</p>
                    <p className="font-mono text-[10px] text-slate-400">{t.name}</p>
                  </div>
                  <span className="font-mono font-black text-sm text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DOSSIER FORENSIK LENGKAP PENGHUNI
          ========================================================================= */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedGuest.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {selectedGuest.is_active ? 'Penghuni Aktif' : 'Sudah Check-out'}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                    Kamar {selectedGuest.room_number} ({selectedGuest.room_type})
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                  {selectedGuest.full_name}
                </h2>
                <p className="text-xs text-slate-400">
                  Dossier Identitas, Riwayat Transaksi, & Jejak Check-in/Check-out
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Photo Evidence 3-Column Dossier */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  1. Berkas Foto Identitas & Bukti Bayar
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Foto KTP */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-600 block uppercase">Foto KTP / Identitas</span>
                    {selectedGuest.id_card_photo_url ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center p-1">
                        <img
                          src={selectedGuest.id_card_photo_url}
                          alt="KTP"
                          className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => {
                            setLightboxUrl(selectedGuest.id_card_photo_url)
                            setLightboxTitle(`Foto KTP: ${selectedGuest.full_name}`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200">
                        Tanpa Foto KTP
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-500 font-bold block truncate">
                      NIK: {selectedGuest.nik || '-'}
                    </span>
                  </div>

                  {/* Foto Selfie */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-600 block uppercase">Foto Wajah (Selfie)</span>
                    {selectedGuest.selfie_photo_url ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center p-1">
                        <img
                          src={selectedGuest.selfie_photo_url}
                          alt="Selfie"
                          className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => {
                            setLightboxUrl(selectedGuest.selfie_photo_url)
                            setLightboxTitle(`Foto Wajah: ${selectedGuest.full_name}`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200">
                        Tanpa Foto Selfie
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-500 font-bold block truncate">
                      {selectedGuest.full_name}
                    </span>
                  </div>

                  {/* Bukti Bayar */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-600 block uppercase">Bukti Pembayaran</span>
                    {selectedGuest.payment_proof_url && !selectedGuest.payment_proof_url.includes('placehold') ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center p-1">
                        <img
                          src={selectedGuest.payment_proof_url}
                          alt="Struk"
                          className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => {
                            setLightboxUrl(selectedGuest.payment_proof_url)
                            setLightboxTitle(`Bukti Bayar: ${selectedGuest.full_name}`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-xs text-amber-800 p-2 text-center">
                        <ShieldCheck className="w-6 h-6 text-amber-600 mb-1" />
                        <strong>Tunai di Resepsionis</strong>
                        <span className="text-[10px] text-amber-600 mt-0.5">Diterima langsung</span>
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-500 font-bold block truncate">
                      Deposit: {selectedGuest.deposit_amount > 0 ? formatRupiah(selectedGuest.deposit_amount) : 'Titip KTP Asli'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data & Info Biodata */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  2. Informasi Detail Kamar & Jadwal
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500">Nama Lengkap:</span><strong className="text-slate-900">{selectedGuest.full_name}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">No. WhatsApp:</span><strong className="text-slate-900 font-mono">{selectedGuest.phone}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">NIK KTP:</span><strong className="text-slate-900 font-mono">{selectedGuest.nik}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Durasi Sewa:</span><strong className="text-slate-900">{selectedGuest.rental_duration}</strong></div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500">Kamar / Lantai:</span><strong className="text-indigo-600 font-bold">Kamar {selectedGuest.room_number} ({selectedGuest.floor_name})</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Waktu Check-In:</span><strong className="text-emerald-700">{selectedGuest.check_in_date ? new Date(selectedGuest.check_in_date).toLocaleString('id-ID') : '-'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Petugas Check-In:</span><strong className="text-slate-900">{selectedGuest.check_in_assigned_by}</strong></div>
                    {!selectedGuest.is_active && (
                      <div className="flex justify-between"><span className="text-slate-500">Petugas Check-Out:</span><strong className="text-rose-700">{selectedGuest.checkout_processed_by || 'Staff'}</strong></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction History for this Guest */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  3. Riwayat Seluruh Transaksi & Pembayaran ({selectedGuest.payments.length})
                </span>
                <div className="space-y-2">
                  {selectedGuest.payments.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      Belum ada mutasi transaksi pembayaran tercatat.
                    </p>
                  ) : (
                    selectedGuest.payments.map((p: any) => {
                      const staff = profileMap.get(p.confirmed_by)
                      return (
                        <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 text-sm">{formatRupiah(parseFloat(p.amount))}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                                {p.payment_method}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{p.notes || 'Pembayaran Sewa'}</p>
                          </div>

                          <div className="text-left sm:text-right font-mono text-[10px] text-slate-400">
                            <div>{new Date(p.created_at || p.payment_date).toLocaleString('id-ID')} WIB</div>
                            <div className="text-indigo-600 font-bold">Verifikator: {staff?.full_name || 'Staff'}</div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full-Resolution Image Viewing */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <p className="text-white text-xs font-mono font-bold mb-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              {lightboxTitle} • Klik di mana saja untuk menutup
            </p>
            <img 
              src={lightboxUrl} 
              alt="Zoomed Evidence" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  )
}
