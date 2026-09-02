'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Database, 
  Users, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  FolderArchive,
  Image as ImageIcon,
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
  ChevronRight,
  Filter,
  Check,
  X,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'

interface AuditVaultClientProps {
  latencyMs: number
  tenants: any[]
  checkIns: any[]
  payments: any[]
  profiles: any[]
  rooms: any[]
  floors: any[]
  branches: any[]
  damages?: any[]
}

export default function AuditVaultClient({
  latencyMs: initialLatency,
  tenants,
  checkIns,
  payments,
  profiles,
  rooms,
  floors,
  branches,
  damages = []
}: AuditVaultClientProps) {
  // Master Password Gate State
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [activeTab, setActiveTab] = useState<'investigator' | 'audit_logs'>('investigator')

  // Investigator Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'checked_out'>('all')
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null)

  // Audit Logs State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all')

  // Latency State
  const [latency, setLatency] = useState(initialLatency)
  const [isPinging, setIsPinging] = useState(false)

  // Image Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState<string>('')

  // Check session storage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dev_audit_vault_unlocked')
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
        sessionStorage.setItem('dev_audit_vault_unlocked', 'sparkplug')
      } catch {}
    } else {
      setPasswordError(true)
    }
  }

  const handleLock = () => {
    setIsUnlocked(false)
    setPasswordInput('')
    try {
      sessionStorage.removeItem('dev_audit_vault_unlocked')
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

  // Combined Comprehensive Audit Timeline Feed (ALL Activities)
  const auditTimeline = useMemo(() => {
    const events: any[] = []
    const activeNames = new Set(tenants.map(t => (t.full_name || '').toLowerCase().trim()))

    // 1. Check-out events (From checked_out status and completed CIR no longer in active tenants)
    checkIns.forEach(c => {
      const cNameLower = (c.full_name || '').toLowerCase().trim()
      const isCheckedOut = c.status === 'checked_out' || (c.status === 'completed' && !activeNames.has(cNameLower))
      
      if (isCheckedOut) {
        const matchedPayment = payments.find(p => (p.notes || '').toLowerCase().includes(cNameLower))
        const staffId = matchedPayment?.confirmed_by || c.assigned_by
        const staff = staffId ? profileMap.get(staffId) : null

        const checkoutTimestamp = (c.status === 'checked_out' ? c.updated_at : null) || matchedPayment?.created_at || c.updated_at || c.created_at
        const roomNumber = c.rooms?.room_number || '-'
        const floorName = c.rooms?.floors?.name || '-'

        events.push({
          type: 'checkout',
          category: 'checkout',
          guestName: c.full_name,
          roomNumber,
          timestamp: checkoutTimestamp,
          staffName: staff?.full_name || staff?.email || 'Staf Resepsionis',
          staffRole: staff?.role || 'staff',
          title: `🚪 Tamu Selesai Check-out: ${c.full_name}`,
          description: `Kamar ${roomNumber} (${floorName}) • Selesai masa sewa & kamar kembali berstatus Kosong`,
          amount: 0,
          staffId: staffId || 'system'
        })
      }
    })

    // 2. Payment events (Rent, Claims, Settlements)
    payments.forEach(pay => {
      const staff = profileMap.get(pay.confirmed_by)
      const isCheckoutSettlement = pay.notes?.includes('[Pelunasan Check-Out]') 
      const isDepositClaim = pay.notes?.includes('[Klaim Deposit]')

      let extractedGuestName = null
      let extractedRoomNumber = null
      if (pay.notes) {
        const nameMatch = pay.notes.match(/Tamu:\s*([^|]+)/i)
        if (nameMatch) extractedGuestName = nameMatch[1].trim()
        const roomMatch = pay.notes.match(/Kamar:\s*([^|]+)/i)
        if (roomMatch) extractedRoomNumber = roomMatch[1].trim()
      }

      const tenant = pay.tenants || tenants.find((t: any) => t.id === pay.tenant_id)
      const guestName = tenant?.full_name || extractedGuestName || 'Tamu'
      const roomNumber = tenant?.rooms?.room_number || extractedRoomNumber || '-'

      events.push({
        type: isCheckoutSettlement 
          ? 'checkout_settlement' 
          : isDepositClaim 
          ? 'deposit_claim' 
          : 'payment_verified',
        category: isCheckoutSettlement || isDepositClaim ? 'checkout' : 'payment',
        guestName,
        roomNumber,
        timestamp: pay.created_at || pay.payment_date,
        staffName: staff?.full_name || staff?.email || 'Staf Resepsionis',
        staffRole: staff?.role || 'staff',
        title: isCheckoutSettlement
          ? `🚪 Pelunasan Denda Check-out: ${formatRupiah(parseFloat(pay.amount))}`
          : isDepositClaim
          ? `🛡️ Klaim Deposit Ganti Rugi: ${formatRupiah(parseFloat(pay.amount))}`
          : `💳 Verifikasi Pembayaran: ${formatRupiah(parseFloat(pay.amount))}`,
        description: `${guestName} (Kamar ${roomNumber}) • ${pay.notes || `Metode: ${(pay.payment_method || '').toUpperCase()}`}`,
        amount: parseFloat(pay.amount) || 0,
        staffId: pay.confirmed_by || 'staff'
      })
    })

    // 3. Check-in assignments & approvals
    checkIns.forEach(c => {
      if (c.assigned_by || c.assigned_at) {
        const staff = profileMap.get(c.assigned_by)
        events.push({
          type: 'check_in_assigned',
          category: 'checkin',
          guestName: c.full_name,
          roomNumber: c.rooms?.room_number || '-',
          timestamp: c.assigned_at || c.updated_at || c.created_at,
          staffName: staff?.full_name || staff?.email || 'Staf Resepsionis',
          staffRole: staff?.role || 'staff',
          title: `🔑 Persetujuan & Penempatan Kamar: ${c.full_name}`,
          description: `Kamar ${c.rooms?.room_number || '-'} (${c.rooms?.floors?.name || '-'}) • Durasi: ${c.rental_duration || 'daily'} • Tagihan: ${formatRupiah(parseFloat(c.total_amount || 0))}`,
          amount: parseFloat(c.total_amount || 0),
          staffId: c.assigned_by
        })
      }
    })

    // 4. Check-in online submissions (Guest self-service)
    checkIns.forEach(c => {
      events.push({
        type: 'check_in_submitted',
        category: 'checkin',
        guestName: c.full_name,
        roomNumber: c.rooms?.room_number || '-',
        timestamp: c.created_at,
        staffName: 'Tamu Mandiri (Online/QR)',
        staffRole: 'guest',
        title: `📥 Pengajuan Check-In Online: ${c.full_name}`,
        description: `Kamar ${c.rooms?.room_number || '-'} • Metode Bayar: ${c.payment_destination || 'Resepsionis'} • No HP: ${c.phone || '-'}`,
        amount: parseFloat(c.total_amount || 0),
        staffId: 'guest'
      })
    })

    // 5. OTA Bookings & Transition Guests
    tenants.forEach(t => {
      const isOta = t.status === 'ota' || t.id_card_url?.startsWith('ota:')
      const isTransition = t.status === 'transition' || t.rental_duration === 'transition' || t.is_transition
      const roomNumber = t.rooms?.room_number || '-'
      const floorName = t.rooms?.floors?.name || '-'

      if (isOta) {
        events.push({
          type: 'ota_booking',
          category: 'ota',
          guestName: t.full_name,
          roomNumber,
          timestamp: t.created_at,
          staffName: 'Staf Resepsionis',
          staffRole: 'staff',
          title: `🏷️ Pendaftaran Tamu OTA: ${t.full_name}`,
          description: `Kamar ${roomNumber} (${floorName}) • Keterisian Kamar Pihak Luar (Sewa s/d ${t.payment_due_date || '-'})`,
          amount: 0,
          staffId: 'staff'
        })
      } else if (isTransition) {
        events.push({
          type: 'transition_guest',
          category: 'ota',
          guestName: t.full_name,
          roomNumber,
          timestamp: t.created_at,
          staffName: 'Staf / Owner',
          staffRole: 'owner',
          title: `🔄 Pendaftaran Tamu Transisi: ${t.full_name}`,
          description: `Kamar ${roomNumber} (${floorName}) • Tamu Transisi Manual (Batas s/d ${t.payment_due_date || '-'})`,
          amount: 0,
          staffId: 'owner'
        })
      }
    })

    // 6. Property Damage logs
    damages.forEach((d: any) => {
      events.push({
        type: 'property_damage',
        category: 'damage',
        guestName: 'Fasilitas Kamar',
        roomNumber: d.rooms?.room_number || '-',
        timestamp: d.created_at,
        staffName: 'Laporan Kerusakan',
        staffRole: 'system',
        title: `⚠️ Kerusakan Dilaporkan: ${d.title || d.description || 'Fasilitas Rusak'}`,
        description: `Kamar ${d.rooms?.room_number || '-'} (${d.rooms?.floors?.name || '-'}) • Biaya Estimasi: ${formatRupiah(parseFloat(d.repair_cost || 0))}`,
        amount: parseFloat(d.repair_cost || 0),
        staffId: 'system'
      })
    })

    // Sort strictly descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return events
  }, [payments, checkIns, tenants, damages, profileMap])

  // Filtered timeline based on staff and category
  const filteredTimeline = useMemo(() => {
    return auditTimeline.filter(e => {
      if (selectedStaffId !== 'all' && e.staffId !== selectedStaffId) return false
      if (selectedActivityType !== 'all' && e.category !== selectedActivityType) return false
      return true
    })
  }, [auditTimeline, selectedStaffId, selectedActivityType])

  // If locked, render the Master Developer Password Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-[10px] font-mono text-indigo-300 tracking-wider uppercase mb-2">
                🔒 Private Creator Vault
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                System Audit & Investigator
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Halaman rahasia khusus pembuat web untuk investigasi forensik penghuni & audit akun.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="w-full space-y-4 pt-2">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Master Password
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
                <span>Buka Akses Vault</span>
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
              Private Creator Vault
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Unlocked
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Investigasi Forensik & Audit Akun</span>
          </h1>
          <p className="text-xs text-slate-400">
            Dossier forensik tamu/penghuni, audit mutasi petugas, dan investigasi mendalam tanpa beban server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={handlePing}
            disabled={isPinging}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isPinging ? 'animate-spin' : ''}`} />
            <span>Latensi ({latency} ms)</span>
          </button>

          <button
            type="button"
            onClick={handleLock}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Vault</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('investigator')}
          className={`flex-1 min-w-[220px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'investigator'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4 text-indigo-200" />
          <span>Investigasi Tamu & Penghuni</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-200 font-bold border border-indigo-700">
            {allGuests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={`flex-1 min-w-[220px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-200" />
          <span>Audit Log Aktivitas Akun</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-200 font-bold border border-indigo-700">
            {profiles.length} Akun
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INVESTIGASI FORENSIK PENGHUNI & TAMU
          ========================================================================= */}
      {activeTab === 'investigator' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama Tamu, No. WhatsApp, NIK KTP, atau Nomor Kamar..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
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
                      : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/40'
                  }`}
                >
                  Aktif ({allGuests.filter(g => g.is_active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('checked_out')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'checked_out'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Check-out ({allGuests.filter(g => !g.is_active).length})
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuests.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-slate-900 rounded-3xl border border-slate-800">
                <Search className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">Data tamu tidak ditemukan</p>
                <p className="text-xs text-slate-500 mt-0.5">Coba kata kunci pencarian nama atau NIK yang lain</p>
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
                    className="bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer space-y-3.5 group relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          guest.is_active
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {guest.is_active ? <UserCheck className="w-3 h-3 text-emerald-400" /> : <UserX className="w-3 h-3 text-slate-500" />}
                          <span>{guest.is_active ? 'Penghuni Aktif' : 'Sudah Check-out'}</span>
                        </span>

                        <span className="font-mono font-black text-xs text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded-md border border-indigo-800">
                          Kamar {guest.room_number}
                        </span>
                      </div>

                      {/* Guest Info */}
                      <h3 className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                        {guest.full_name}
                      </h3>
                      <div className="text-xs text-slate-400 space-y-1 mt-1 font-medium">
                        <p className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span>{guest.phone || '-'}</span>
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <CreditCard className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="font-mono">NIK: {guest.nik || '-'}</span>
                        </p>
                      </div>

                      {/* Photo Thumbnail Badges */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800 text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasKtp ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40' : 'bg-slate-950 text-slate-600'
                        }`}>
                          🪪 {hasKtp ? 'KTP Ada' : 'Tanpa KTP'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasSelfie ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40' : 'bg-slate-950 text-slate-600'
                        }`}>
                          👤 {hasSelfie ? 'Selfie Ada' : 'Tanpa Selfie'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasProof ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40' : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                        }`}>
                          🧾 {hasProof ? 'Struk Ada' : 'Tunai'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
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
                  className={`bg-slate-900 p-5 rounded-3xl border transition-all cursor-pointer space-y-4 relative ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl' 
                      : 'border-slate-800 hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        m.profile.role === 'owner'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {m.profile.role?.toUpperCase()}
                      </span>
                      <h3 className="font-extrabold text-white text-lg mt-1">
                        {m.profile.full_name || 'Staff User'}
                      </h3>
                      <p className="text-xs text-slate-400">{m.profile.email}</p>
                    </div>

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-500 block">Check-In</span>
                      <span className="text-sm font-black text-slate-200">{m.assignedCheckInsCount}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-500 block">Bayar Sah</span>
                      <span className="text-sm font-black text-emerald-400">{m.confirmedPaymentsCount}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-500 block">Check-Out</span>
                      <span className="text-sm font-black text-indigo-400">{m.checkoutsHandledCount}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400">Total Uang Diproses:</span>
                    <span className="font-mono font-black text-xs text-emerald-300">{formatRupiah(m.totalMoneyHandled)}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-bold text-center">
                    {isSelected ? '✓ Filter timeline aktif' : 'Klik untuk filter timeline'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Timeline Stream */}
          <div className="bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <span>Jejak Audit Seluruh Aktivitas Sistem</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {filteredTimeline.length} Log
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Kronologi lengkap: Check-Out tamu, Persetujuan Check-In, Mutasi Kas/QRIS, Tamu OTA, dan Laporan Kerusakan.
                </p>
              </div>

              {selectedStaffId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffId('all')}
                  className="text-xs font-bold text-indigo-300 bg-indigo-950 px-3 py-1 rounded-lg border border-indigo-800 hover:bg-indigo-900 transition-colors cursor-pointer w-fit"
                >
                  Tampilkan Semua Akun
                </button>
              )}
            </div>

            {/* Activity Category Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-2">
              {[
                { id: 'all', label: 'Semua Aktivitas', icon: '🌐' },
                { id: 'checkout', label: '🚪 Check-Out Selesai', icon: '🚪' },
                { id: 'checkin', label: '🔑 Check-In & Kamar', icon: '🔑' },
                { id: 'payment', label: '💳 Pembayaran Kas & QRIS', icon: '💳' },
                { id: 'ota', label: '🏷️ Tamu OTA & Transisi', icon: '🏷️' },
                { id: 'damage', label: '⚠️ Kerusakan Fasilitas', icon: '⚠️' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedActivityType(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedActivityType === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredTimeline.length === 0 ? (
                <div className="py-12 text-center bg-slate-950 rounded-2xl border border-slate-800">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400 font-bold">Belum ada jejak aktivitas untuk filter ini.</p>
                </div>
              ) : (
                filteredTimeline.map((ev, idx) => {
                  let badgeBg = 'bg-indigo-950 text-indigo-400 border-indigo-800'
                  let icon = <Activity className="w-4 h-4 text-indigo-400" />

                  if (ev.category === 'checkout') {
                    badgeBg = 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                    icon = <UserX className="w-4 h-4 text-rose-400" />
                  } else if (ev.category === 'payment') {
                    badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                    icon = <Receipt className="w-4 h-4 text-emerald-400" />
                  } else if (ev.category === 'ota') {
                    badgeBg = 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                    icon = <Building2 className="w-4 h-4 text-amber-400" />
                  } else if (ev.category === 'checkin') {
                    badgeBg = 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                    icon = <UserCheck className="w-4 h-4 text-blue-400" />
                  } else if (ev.category === 'damage') {
                    badgeBg = 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                    icon = <AlertTriangle className="w-4 h-4 text-purple-400" />
                  }

                  return (
                    <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${badgeBg}`}>
                        {icon}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-extrabold text-white text-xs">{ev.title}</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {new Date(ev.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{ev.description}</p>
                        <div className="flex items-center gap-3 pt-0.5 text-[10px]">
                          <span className="text-indigo-400 font-bold">
                            Pelaksana: <strong className="text-slate-200">{ev.staffName}</strong> ({ev.staffRole})
                          </span>
                          {ev.roomNumber && ev.roomNumber !== '-' && (
                            <span className="text-slate-400 font-mono">
                              Unit: Kamar {ev.roomNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DOSSIER FORENSIK LENGKAP PENGHUNI
          ========================================================================= */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 text-white">
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 sm:p-6 flex items-start justify-between gap-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedGuest.is_active
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
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
                  <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Foto KTP / Identitas</span>
                    {selectedGuest.id_card_photo_url ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center p-1">
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
                      <div className="w-full h-44 rounded-xl bg-slate-900 flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800">
                        Tanpa Foto KTP
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-400 font-bold block truncate">
                      NIK: {selectedGuest.nik || '-'}
                    </span>
                  </div>

                  {/* Foto Selfie */}
                  <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Foto Wajah (Selfie)</span>
                    {selectedGuest.selfie_photo_url ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center p-1">
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
                      <div className="w-full h-44 rounded-xl bg-slate-900 flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800">
                        Tanpa Foto Selfie
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-400 font-bold block truncate">
                      {selectedGuest.full_name}
                    </span>
                  </div>

                  {/* Bukti Bayar */}
                  <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Bukti Pembayaran</span>
                    {selectedGuest.payment_proof_url && !selectedGuest.payment_proof_url.includes('placehold') ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center p-1">
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
                      <div className="w-full h-44 rounded-xl bg-amber-950/40 border border-amber-800/40 flex flex-col items-center justify-center text-xs text-amber-300 p-2 text-center">
                        <ShieldCheck className="w-6 h-6 text-amber-400 mb-1" />
                        <strong>Tunai di Resepsionis</strong>
                        <span className="text-[10px] text-amber-400 mt-0.5">Diterima langsung</span>
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-slate-400 font-bold block truncate">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-400">Nama Lengkap:</span><strong className="text-white">{selectedGuest.full_name}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-400">No. WhatsApp:</span><strong className="text-white font-mono">{selectedGuest.phone}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-400">NIK KTP:</span><strong className="text-white font-mono">{selectedGuest.nik}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-400">Durasi Sewa:</span><strong className="text-white">{selectedGuest.rental_duration}</strong></div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-400">Kamar / Lantai:</span><strong className="text-indigo-400 font-bold">Kamar {selectedGuest.room_number} ({selectedGuest.floor_name})</strong></div>
                    <div className="flex justify-between"><span className="text-slate-400">Waktu Check-In:</span><strong className="text-emerald-400">{selectedGuest.check_in_date ? new Date(selectedGuest.check_in_date).toLocaleString('id-ID') : '-'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-400">Petugas Check-In:</span><strong className="text-white">{selectedGuest.check_in_assigned_by}</strong></div>
                    {!selectedGuest.is_active && (
                      <div className="flex justify-between"><span className="text-slate-400">Petugas Check-Out:</span><strong className="text-rose-400">{selectedGuest.checkout_processed_by || 'Staff'}</strong></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction History for this Guest */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  3. Riwayat Transaksi & Pembayaran ({selectedGuest.payments.length})
                </span>
                <div className="space-y-2">
                  {selectedGuest.payments.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      Belum ada mutasi transaksi pembayaran tercatat.
                    </p>
                  ) : (
                    selectedGuest.payments.map((p: any) => {
                      const staff = profileMap.get(p.confirmed_by)
                      return (
                        <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-white text-sm">{formatRupiah(parseFloat(p.amount))}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
                                {p.payment_method}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{p.notes || 'Pembayaran Sewa'}</p>
                          </div>

                          <div className="text-left sm:text-right font-mono text-[10px] text-slate-400">
                            <div>{new Date(p.created_at || p.payment_date).toLocaleString('id-ID')} WIB</div>
                            <div className="text-indigo-400 font-bold">Verifikator: {staff?.full_name || 'Staff'}</div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Section 4: Visual Forensic Timeline for this Specific Guest */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  4. Rekam Jejak Forensik Tamu (Kronologi Lengkap)
                </span>
                <div className="space-y-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {(() => {
                    const guestEvents = auditTimeline.filter(e => {
                      const gNameLower = (selectedGuest.full_name || '').toLowerCase().trim()
                      return (
                        (e.guestName && e.guestName.toLowerCase().trim() === gNameLower) ||
                        (e.description && e.description.toLowerCase().includes(gNameLower)) ||
                        (e.title && e.title.toLowerCase().includes(gNameLower))
                      )
                    })

                    if (guestEvents.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 text-center py-2">
                          Data kronologi otomatis disinkronkan saat tamu check-in / check-out.
                        </p>
                      )
                    }

                    return guestEvents.map((gev, gIdx) => (
                      <div key={gIdx} className="flex items-start gap-3 text-xs">
                        <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-indigo-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                          {gIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <strong className="text-white text-xs">{gev.title}</strong>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(gev.timestamp).toLocaleString('id-ID')} WIB
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{gev.description}</p>
                          <p className="text-[10px] text-indigo-400 font-bold">
                            Pelaksana: <span className="text-slate-300">{gev.staffName}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  })()}
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
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out"
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
