'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { processCheckout } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import { 
  Users, 
  Search, 
  Filter, 
  Building2, 
  Layers, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  RotateCcw,
  LogOut,
  ExternalLink,
  Zap,
  DoorClosed,
  UserCheck,
  QrCode,
  ShieldCheck,
  Banknote,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface TenantListProps {
  initialTenants: any[]
  initialAvailableRooms: any[]
  branches: any[]
  floors: any[]
  userRole: string
}

export default function TenantList({ 
  initialTenants, 
  initialAvailableRooms, 
  branches = [], 
  floors = [], 
  userRole 
}: TenantListProps) {
  const router = useRouter()
  const [tenants, setTenants] = useState(initialTenants)
  
  // Checkout Modal states
  const [checkoutTenant, setCheckoutTenant] = useState<any>(null)
  const [checkoutDate, setCheckoutDate] = useState<string>('')
  const [checkoutTime, setCheckoutTime] = useState<string>('')
  const [damageFee, setDamageFee] = useState<number>(0)
  const [checkoutNotes, setCheckoutNotes] = useState<string>('')
  const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const [checkoutState, checkoutAction] = useActionState(processCheckout, null)

  useEffect(() => {
    setTenants(initialTenants)
  }, [initialTenants])

  useEffect(() => {
    if (checkoutState?.success) {
      setCheckoutTenant(null)
      router.refresh()
    }
  }, [checkoutState, router])

  // Set default current date and time when checkout modal opens
  useEffect(() => {
    if (checkoutTenant) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      setCheckoutDate(`${year}-${month}-${day}`)
      setCheckoutTime(`${hours}:${mins}`)
      setDamageFee(0)
      setCheckoutNotes('')
      setAdditionalPaymentMethod('cash')
    }
  }, [checkoutTenant])

  // Calculate late fee based on checkout date & time vs tenant's payment due date
  const { lateFee: calculatedLateFee, lateStatusText, isLate } = useMemo(() => {
    if (!checkoutTenant || !checkoutDate || !checkoutTime) {
      return { lateFee: 0, lateStatusText: 'Tepat Waktu (≤ 12:00 WIB)', isLate: false }
    }

    const dueDateStr = checkoutTenant.payment_due_date
    if (!dueDateStr) {
      return { lateFee: 0, lateStatusText: 'Tepat Waktu (≤ 12:00 WIB)', isLate: false }
    }

    // Compare date parts
    const [cYear, cMonth, cDay] = checkoutDate.split('-').map(Number)
    const [dYear, dMonth, dDay] = dueDateStr.split('-').map(Number)

    const cDateObj = new Date(cYear, cMonth - 1, cDay)
    const dDateObj = new Date(dYear, dMonth - 1, dDay)

    const diffTime = cDateObj.getTime() - dDateObj.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    // 1. Check-out SEBELUM tanggal jatuh tempo (masih dalam masa sewa aktif)
    if (diffDays < 0) {
      return { 
        lateFee: 0, 
        lateStatusText: `Check-Out Lebih Awal (${Math.abs(diffDays)} hari sebelum batas selesai)`, 
        isLate: false 
      }
    }

    const [hStr, mStr] = checkoutTime.split(':')
    const hours = parseInt(hStr) || 0
    const minutes = parseInt(mStr) || 0
    const totalMinutes = hours * 60 + minutes

    const checkoutStandardMinutes = 12 * 60 // 12:00 WIB
    const threePMMinutes = 15 * 60 // 15:00 WIB
    const fivePMMinutes = 17 * 60 // 17:00 WIB

    // 2. Check-out PADA tanggal jatuh tempo (diffDays === 0)
    if (diffDays === 0) {
      if (totalMinutes <= checkoutStandardMinutes) {
        return { 
          lateFee: 0, 
          lateStatusText: 'Tepat Waktu (≤ 12:00 WIB)', 
          isLate: false 
        }
      } else if (totalMinutes <= threePMMinutes) {
        return { 
          lateFee: 50000, 
          lateStatusText: `Telat (${checkoutTime} WIB, s/d 15:00 WIB)`, 
          isLate: true 
        }
      } else if (totalMinutes <= fivePMMinutes) {
        return { 
          lateFee: 100000, 
          lateStatusText: `Telat (${checkoutTime} WIB, 15:00–17:00 WIB)`, 
          isLate: true 
        }
      } else {
        return { 
          lateFee: 100000, 
          lateStatusText: `Telat (${checkoutTime} WIB, > 17:00 WIB / 1 Hari)`, 
          isLate: true 
        }
      }
    }

    // 3. Check-out SETELAH tanggal jatuh tempo (diffDays > 0)
    let fee = diffDays * 100000
    if (totalMinutes > checkoutStandardMinutes) {
      if (totalMinutes <= threePMMinutes) fee += 50000
      else fee += 100000
    }

    return {
      lateFee: fee,
      lateStatusText: `Telat ${diffDays} Hari (${checkoutTime} WIB)`,
      isLate: true
    }
  }, [checkoutTenant, checkoutDate, checkoutTime])

  const initialDeposit = checkoutTenant?.deposit_amount ? parseFloat(checkoutTenant.deposit_amount) : 100000
  const totalCharge = calculatedLateFee + damageFee
  const claimedDeposit = Math.min(initialDeposit, totalCharge)
  const netRefund = Math.max(0, initialDeposit - totalCharge)
  const additionalPayNeeded = Math.max(0, totalCharge - initialDeposit)

  // Helper to determine due date status
  const getDueStatus = (dueDateStr: string) => {
    if (!dueDateStr) return 'active'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDateStr)
    due.setHours(0, 0, 0, 0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'overdue'
    if (diffDays <= 7) return 'near'
    return 'active'
  }

  // Filtered tenants calculation
  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      // Search filter (name, room number, phone)
      const q = searchQuery.toLowerCase()
      const nameMatch = tenant.full_name?.toLowerCase().includes(q)
      const roomMatch = tenant.rooms?.room_number?.toString().toLowerCase().includes(q)
      const phoneMatch = tenant.phone?.toLowerCase().includes(q) || tenant.phone_number?.toLowerCase().includes(q)
      if (searchQuery && !nameMatch && !roomMatch && !phoneMatch) return false

      // Floor filter
      const tenantFloorId = tenant.rooms?.floor_id || tenant.rooms?.floors?.id
      if (selectedFloor !== 'all' && tenantFloorId !== selectedFloor) return false

      // Due date status filter
      if (selectedStatus !== 'all') {
        const status = getDueStatus(tenant.payment_due_date)
        if (status !== selectedStatus) return false
      }

      return true
    })
  }, [tenants, searchQuery, selectedFloor, selectedStatus])

  // Statistics calculation
  const stats = useMemo(() => {
    let active = 0
    let near = 0
    let overdue = 0

    tenants.forEach(t => {
      const st = getDueStatus(t.payment_due_date)
      if (st === 'overdue') overdue++
      else if (st === 'near') near++
      else active++
    })

    return { total: tenants.length, active, near, overdue }
  }, [tenants])

  const hasActiveFilters = searchQuery !== '' || selectedFloor !== 'all' || selectedStatus !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedFloor('all')
    setSelectedStatus('all')
  }

  const headers = ['Penghuni', 'Kamar', 'Tgl Masuk', 'Jatuh Tempo / Selesai', 'Uang Deposit', 'Aksi']
  
  const rows = filteredTenants.map(tenant => {
    const floorName = tenant.rooms?.floors?.name || 'Lantai'
    const roomNumber = tenant.rooms?.room_number || '-'
    const isVip = roomNumber.toLowerCase().includes('vip')
    const dueStatus = getDueStatus(tenant.payment_due_date)
    const dueDate = tenant.payment_due_date ? new Date(tenant.payment_due_date) : null

    return [
      <div key={`name-${tenant.id}`} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
          {tenant.full_name?.substring(0, 2).toUpperCase() || 'P'}
        </div>
        <div>
          <p className="font-bold text-slate-900 leading-tight">{tenant.full_name}</p>
          {tenant.id_card_url && (
            <a 
              href={tenant.id_card_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 mt-0.5"
            >
              Foto KTP <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>,

      <div key={`room-${tenant.id}`}>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
          <DoorClosed className="w-3.5 h-3.5 text-indigo-600" />
          <span>Kamar {roomNumber}</span>
          {isVip && (
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded">
              VIP
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-semibold">
          {floorName}
        </p>
      </div>,

      <span key={`checkin-${tenant.id}`} className="text-xs text-slate-600 font-medium">
        {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
      </span>,

      <div key={`due-${tenant.id}`}>
        {dueDate ? (
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              dueStatus === 'overdue'
                ? 'bg-red-100 text-red-700'
                : dueStatus === 'near'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {dueStatus === 'overdue' && <AlertTriangle className="w-3 h-3 text-red-600" />}
              {dueStatus === 'near' && <Clock className="w-3 h-3 text-amber-600" />}
              {dueStatus === 'active' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5 pl-1">
              {dueStatus === 'overdue' ? 'Lewat tempo' : dueStatus === 'near' ? 'Jatuh tempo segera' : 'Aktif'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>,

      <div key={`deposit-${tenant.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Rp 100.000</span>
      </div>,

      <button
        key={`action-${tenant.id}`}
        type="button"
        onClick={() => setCheckoutTenant(tenant)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 transition-all duration-150 cursor-pointer shadow-xs"
      >
        <LogOut className="w-3.5 h-3.5" />
        Proses Check-out
      </button>
    ]
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Penghuni Graha Aisyah Menteng
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {filteredTenants.length} dari {tenants.length} Aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data penyewa, pengembalian deposit Rp 100.000, dan kalkulasi denda keterlambatan check-out
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/check-ins"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all duration-200"
          >
            <UserCheck className="w-4 h-4" />
            Permintaan Check-in
          </Link>
          <Link
            href="/dashboard/qr-generator"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all duration-200"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            QR Check-in
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Penghuni</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Penghuni Aktif Graha Aisyah</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status Lancar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.active}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pembayaran tepat waktu</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jatuh Tempo &lt; 7 Hari</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.near}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Perlu konfirmasi perpanjangan</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Menunggak / Telat</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Melewati batas waktu sewa</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Pencarian & Filter Penghuni</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / no. kamar (VIP / 201)..."
              className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Floor Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">Semua Lantai</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Due Status Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Status Lancar</option>
              <option value="near">Segera Jatuh Tempo (&le; 7 Hari)</option>
              <option value="overdue">Menunggak / Melewati Tempo</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Data */}
      {filteredTenants.length > 0 ? (
        <Table headers={headers} rows={rows} />
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada data penghuni yang cocok</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Ubah kata kunci pencarian atau reset filter di atas untuk melihat seluruh penghuni Graha Aisyah Menteng.
          </p>
        </div>
      )}

      {/* =========================================================================
          MODAL CHECK-OUT DENGAN KALKULASI DENDA TELAT & PENGEMBALIAN DEPOSIT
      ========================================================================= */}
      <Modal isOpen={!!checkoutTenant} onClose={() => setCheckoutTenant(null)} size="md">
        {checkoutTenant && (
          <form action={checkoutAction} className="space-y-4 py-1">
            <input type="hidden" name="id" value={checkoutTenant.id} />
            <input type="hidden" name="late_fee" value={calculatedLateFee} />
            <input type="hidden" name="damage_fee" value={damageFee} />
            <input type="hidden" name="deposit_refund" value={netRefund} />
            <input type="hidden" name="additional_pay_needed" value={additionalPayNeeded} />
            <input type="hidden" name="claimed_deposit" value={claimedDeposit} />
            <input type="hidden" name="additional_payment_method" value={additionalPaymentMethod} />

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Proses Check-Out Penghuni</h3>
                <p className="text-xs text-slate-500">
                  {checkoutTenant.full_name} • Kamar {checkoutTenant.rooms?.room_number}
                </p>
              </div>
            </div>

            {/* Tanggal & Jam Checkout & Perhitungan Denda */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Batas Selesai Sewa (Normal):</span>
                  <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {checkoutTenant.payment_due_date 
                        ? new Date(checkoutTenant.payment_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : '-'} • Pukul 12:00 WIB
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tgl Check-Out:</label>
                    <input
                      type="date"
                      required
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Jam:</label>
                    <input
                      type="time"
                      required
                      value={checkoutTime}
                      onChange={(e) => setCheckoutTime(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Denda Rule Indicator */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Status Waktu Check-Out:</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                    !isLate
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lateStatusText}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Denda Keterlambatan:</span>
                  <span className={`font-black ${calculatedLateFee > 0 ? 'text-red-600 text-sm' : 'text-emerald-700'}`}>
                    {calculatedLateFee > 0 
                      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculatedLateFee)
                      : 'Rp 0 (Bebas Denda)'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                  * Aturan denda: Berlaku pada/setelah tanggal jatuh tempo. s/d 15:00 WIB denda Rp 50.000 | 15:00–17:00 WIB denda Rp 100.000 | &gt; 17:00 WIB denda Rp 100.000 (1 hari).
                </p>
              </div>

              {/* Input Biaya Kerusakan / Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biaya Kerusakan / Kebersihan Lainnya (Opsional):
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-semibold">Rp</span>
                  <input
                    type="number"
                    name="damage_fee"
                    min="0"
                    step="1000"
                    value={damageFee || ''}
                    onChange={(e) => setDamageFee(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Rincian Pengembalian & Klaim Deposit */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Uang Deposit Terdaftar:</span>
                <span className="font-bold text-slate-900">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(initialDeposit)}
                </span>
              </div>
              {calculatedLateFee > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Denda Keterlambatan:</span>
                  <span className="font-bold">- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculatedLateFee)}</span>
                </div>
              )}
              {damageFee > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Biaya Kerusakan:</span>
                  <span className="font-bold">- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(damageFee)}</span>
                </div>
              )}
              {claimedDeposit > 0 && (
                <div className="flex justify-between text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-100 font-medium">
                  <span>Deposit Diklaim (Ganti Rugi):</span>
                  <span className="font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claimedDeposit)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold">
                <span className="text-emerald-900">Sisa Deposit Kembali ke Tamu:</span>
                <span className="text-emerald-700 text-base">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(netRefund)}
                </span>
              </div>

              {additionalPayNeeded > 0 && (
                <div className="mt-2 space-y-2 pt-2 border-t border-red-200">
                  <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
                    <p className="text-xs text-red-700 font-bold flex items-center justify-between">
                      <span>Kekurangan Biaya (Wajib Bayar):</span>
                      <span className="text-sm font-black text-red-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(additionalPayNeeded)}
                      </span>
                    </p>
                    <p className="text-[10px] text-red-500 mt-0.5">
                      * Denda & kerusakan melebihi deposit. Tamu harus melunasi sisa kekurangan ini.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Metode Pelunasan Kekurangan oleh Tamu:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdditionalPaymentMethod('cash')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          additionalPaymentMethod === 'cash'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Tunai Resepsionis
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdditionalPaymentMethod('transfer')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          additionalPaymentMethod === 'transfer'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Transfer / QRIS
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Catatan Check-Out */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Pemeriksaan Kamar / Serah Terima Kunci:
              </label>
              <textarea
                name="notes"
                rows={2}
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Contoh: Kunci kamar diserahkan lengkap, AC dan fasilitas diperiksa."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutTenant(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="danger"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                loadingText="Memproses Check-out..."
              >
                Konfirmasi Check-out
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}