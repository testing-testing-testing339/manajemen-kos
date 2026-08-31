'use client'

import { useState, useMemo } from 'react'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import { 
  LogOut, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Receipt, 
  ShieldCheck, 
  DollarSign, 
  Building2, 
  DoorClosed, 
  Printer, 
  UserCheck,
  Building,
  User,
  Phone,
  Banknote,
  FileText,
  CreditCard,
  ChevronDown
} from 'lucide-react'

interface CheckoutHistoryItem {
  id: string
  tenant_name: string
  phone?: string | null
  room_number?: string | null
  floor_name?: string | null
  room_type?: string | null
  check_in_date?: string | null
  due_date?: string | null
  checkout_date?: string | null
  checkout_time?: string | null
  deposit_amount?: number
  late_fee?: number
  damage_fee?: number
  claimed_deposit?: number
  deposit_refund?: number
  additional_pay_needed?: number
  notes?: string | null
  processed_by?: string | null
  created_at?: string
}

interface CheckoutHistoryListProps {
  initialHistory: CheckoutHistoryItem[]
  claimPayments: any[]
  branches: any[]
  floors: any[]
  userRole: string
}

export default function CheckoutHistoryList({
  initialHistory = [],
  claimPayments = [],
  branches = [],
  floors = [],
  userRole
}: CheckoutHistoryListProps) {
  const [history, setHistory] = useState<CheckoutHistoryItem[]>(initialHistory)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoomType, setSelectedRoomType] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState<CheckoutHistoryItem | null>(null)

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Search filter
      const q = searchQuery.toLowerCase()
      const nameMatch = item.tenant_name?.toLowerCase().includes(q)
      const roomMatch = item.room_number?.toString().toLowerCase().includes(q)
      const phoneMatch = item.phone?.toLowerCase().includes(q)
      const notesMatch = item.notes?.toLowerCase().includes(q)
      if (searchQuery && !nameMatch && !roomMatch && !phoneMatch && !notesMatch) return false

      // Room Type filter
      if (selectedRoomType !== 'all') {
        const isVip = item.room_type?.toLowerCase().includes('vip')
        if (selectedRoomType === 'vip' && !isVip) return false
        if (selectedRoomType === 'non_vip' && isVip) return false
      }

      // Period filter
      if (selectedPeriod !== 'all' && item.checkout_date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const cDate = new Date(item.checkout_date)
        cDate.setHours(0, 0, 0, 0)

        const diffTime = today.getTime() - cDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (selectedPeriod === 'today' && diffDays !== 0) return false
        if (selectedPeriod === '7days' && (diffDays < 0 || diffDays > 7)) return false
        if (selectedPeriod === '30days' && (diffDays < 0 || diffDays > 30)) return false
      }

      return true
    })
  }, [history, searchQuery, selectedRoomType, selectedPeriod])

  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalCheckouts = history.length
    let totalRefunded = 0
    let totalLateFees = 0
    let totalDamageFees = 0
    let totalDepositClaimed = 0

    history.forEach(item => {
      totalRefunded += Number(item.deposit_refund || 0)
      totalLateFees += Number(item.late_fee || 0)
      totalDamageFees += Number(item.damage_fee || 0)
      totalDepositClaimed += Number(item.claimed_deposit || 0)
    })

    return {
      totalCheckouts,
      totalRefunded,
      totalLateFees,
      totalDamageFees,
      totalDepositClaimed,
      totalPenalties: totalLateFees + totalDamageFees
    }
  }, [history])

  const hasActiveFilters = searchQuery !== '' || selectedRoomType !== 'all' || selectedPeriod !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedRoomType('all')
    setSelectedPeriod('all')
  }

  // Print Receipt handler
  const handlePrintReceipt = () => {
    window.print()
  }

  // Format currency
  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val || 0))
  }

  // Table Headers
  const tableHeaders = [
    'Penghuni & Kontak',
    'Kamar & Lantai',
    'Periode Tinggal',
    'Waktu Check-Out',
    'Rincian Deposit & Denda',
    'Petugas / Resepsionis',
    'Aksi'
  ]

  // Table Data Mapping
  const tableData = filteredHistory.map(item => {
    const isVip = item.room_type?.toLowerCase().includes('vip')
    const hasPenalty = (item.late_fee || 0) > 0 || (item.damage_fee || 0) > 0

    return [
      // 1. Tenant info
      <div key={`tenant-${item.id}`} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
          {item.tenant_name?.slice(0, 2).toUpperCase() || 'TM'}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 leading-tight">
            {item.tenant_name}
          </p>
          {item.phone && (
            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              {item.phone}
            </p>
          )}
        </div>
      </div>,

      // 2. Room info
      <div key={`room-${item.id}`}>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
          <DoorClosed className="w-3.5 h-3.5 text-indigo-600" />
          <span>Kamar {item.room_number || '-'}</span>
          {isVip && (
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded">
              VIP
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-semibold">
          {item.floor_name || 'Graha Aisyah Menteng'}
        </p>
      </div>,

      // 3. Stay Period
      <div key={`period-${item.id}`} className="text-xs space-y-0.5">
        <p className="text-slate-700 font-medium">
          Masuk: <strong className="text-slate-900">{item.check_in_date ? new Date(item.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</strong>
        </p>
        <p className="text-slate-500 text-[11px]">
          Batas: {item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </p>
      </div>,

      // 4. Checkout Time & Status
      <div key={`time-${item.id}`} className="space-y-1">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{item.checkout_date ? new Date(item.checkout_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
          hasPenalty ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}>
          {hasPenalty ? <Clock className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          {item.checkout_time || '12:00'} WIB • {hasPenalty ? 'Ada Denda' : 'Tepat Waktu'}
        </span>
      </div>,

      // 5. Financials (Deposit & Refund)
      <div key={`fin-${item.id}`} className="text-xs space-y-0.5">
        {(item.deposit_amount || 0) > 0 ? (
          <p className="text-emerald-700 font-bold">
            Kembali: {formatCurrency(item.deposit_refund)}
          </p>
        ) : (
          <p className="text-blue-700 font-bold flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-blue-600" />
            <span>KTP Dikembalikan</span>
          </p>
        )}
        {(item.late_fee || 0) > 0 && (
          <p className="text-[11px] text-red-600 font-medium">
            Denda Telat: - {formatCurrency(item.late_fee)}
          </p>
        )}
        {(item.damage_fee || 0) > 0 && (
          <p className="text-[11px] text-red-600 font-medium">
            Kerusakan: - {formatCurrency(item.damage_fee)}
          </p>
        )}
        {((item.claimed_deposit || 0) > 0 || (item.additional_pay_needed || 0) > 0) && (
          <p className="text-[10px] text-purple-700 font-semibold">
            Total Potongan: {formatCurrency((item.claimed_deposit || 0) + (item.additional_pay_needed || 0))}
          </p>
        )}
      </div>,

      // 6. Processor
      <div key={`proc-${item.id}`}>
        <p className="text-xs font-semibold text-slate-800">
          {item.processed_by || 'Resepsionis'}
        </p>
        {item.notes && (
          <p className="text-[10px] text-slate-500 max-w-[140px] truncate" title={item.notes}>
            {item.notes}
          </p>
        )}
      </div>,

      // 7. Actions
      <div key={`act-${item.id}`} className="flex items-center gap-1.5">
        <button
          onClick={() => setSelectedReceipt(item)}
          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          title="Lihat Nota & Rincian Check-Out"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Nota</span>
        </button>
      </div>
    ]
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Riwayat Check-Out Tamu
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Catatan histori tamu selesai menginap, serah terima kamar, pengembalian deposit, dan denda
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Muat ulang data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Check-Out */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tamu Check-Out</p>
            <p className="text-xl font-black text-slate-900">{stats.totalCheckouts} Tamu</p>
          </div>
        </div>

        {/* Total Deposit Dikembalikan */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Deposit Dikembalikan</p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(stats.totalRefunded)}</p>
          </div>
        </div>

        {/* Total Denda & Kerusakan Terklaim */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Deposit Diklaim (Ganti Rugi)</p>
            <p className="text-xl font-black text-purple-700">{formatCurrency(stats.totalDepositClaimed)}</p>
          </div>
        </div>

        {/* Total Denda Keterlambatan */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Denda Keterlambatan</p>
            <p className="text-xl font-black text-rose-700">{formatCurrency(stats.totalLateFees)}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama tamu, no. kamar, no. telepon, catatan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Period Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Room Type Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4 text-purple-500" />
            </div>
            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">Semua Tipe Kamar</option>
              <option value="vip">VIP Belakang Warkop</option>
              <option value="non_vip">Standard Room</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Ditemukan <strong>{filteredHistory.length}</strong> data riwayat</span>
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredHistory.length > 0 ? (
          <Table headers={tableHeaders} rows={tableData} />
        ) : (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Check-Out</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Riwayat akan otomatis tercatat setiap kali staf resepsionis memproses check-out penghuni di menu Penghuni.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL NOTA / TANDA TERIMA CHECK-OUT
      ========================================================================= */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} size="md">
        {selectedReceipt && (
          <div className="space-y-4 py-1">
            {/* Header Nota */}
            <div className="text-center pb-3 border-b border-slate-100 space-y-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20 mb-2">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                GRAHA AISYAH MENTENG
              </h3>
              <p className="text-[11px] text-slate-500">
                Tanda Terima Check-Out & Pengembalian Deposit
              </p>
              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold rounded-md border border-emerald-200">
                NO: OUT-{selectedReceipt.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Guest & Room Details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama Penghuni</span>
                  <p className="font-bold text-slate-800">{selectedReceipt.tenant_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Kamar</span>
                  <p className="font-bold text-indigo-600">
                    Kamar {selectedReceipt.room_number || '-'} ({selectedReceipt.room_type || 'Standard'})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Tgl Masuk (Check-In)</span>
                  <p className="font-semibold text-slate-700">
                    {selectedReceipt.check_in_date ? new Date(selectedReceipt.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Waktu Selesai Check-Out</span>
                  <p className="font-semibold text-slate-700">
                    {selectedReceipt.checkout_date ? new Date(selectedReceipt.checkout_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} • {selectedReceipt.checkout_time || '12:00'} WIB
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                Rincian Rekonsiliasi Jaminan & Deposit
              </p>

              {(selectedReceipt.deposit_amount || 0) > 0 ? (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Uang Deposit Awal:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(selectedReceipt.deposit_amount)}</span>
                  </div>

                  {(selectedReceipt.late_fee || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Denda Keterlambatan Check-Out:</span>
                      <span className="font-bold">- {formatCurrency(selectedReceipt.late_fee)}</span>
                    </div>
                  )}

                  {(selectedReceipt.damage_fee || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Biaya Kerusakan / Kebersihan:</span>
                      <span className="font-bold">- {formatCurrency(selectedReceipt.damage_fee)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black">
                    <span className="text-emerald-900">Sisa Deposit Dikembalikan:</span>
                    <span className="text-emerald-700 text-base">{formatCurrency(selectedReceipt.deposit_refund)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Jenis Jaminan Check-In:</span>
                    <span className="font-bold text-blue-700">Titip KTP Fisik Asli</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Serah Terima Jaminan:</span>
                    <span className="font-bold text-emerald-700">KTP Fisik Diserahkan Kembali</span>
                  </div>

                  {(selectedReceipt.late_fee || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Denda Keterlambatan Check-Out:</span>
                      <span className="font-bold">{formatCurrency(selectedReceipt.late_fee)}</span>
                    </div>
                  )}

                  {(selectedReceipt.damage_fee || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Biaya Kerusakan / Kebersihan:</span>
                      <span className="font-bold">{formatCurrency(selectedReceipt.damage_fee)}</span>
                    </div>
                  )}
                </>
              )}

              {(selectedReceipt.additional_pay_needed || 0) > 0 && (
                <div className="pt-1.5 text-xs text-red-600 font-bold flex justify-between">
                  <span>Kekurangan Bayar (Lunas):</span>
                  <span>{formatCurrency(selectedReceipt.additional_pay_needed)}</span>
                </div>
              )}
            </div>

            {/* Notes & Staff Signature */}
            {selectedReceipt.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-0.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Catatan Pemeriksaan Kamar:</span>
                <p className="text-amber-900">{selectedReceipt.notes}</p>
              </div>
            )}

            <div className="pt-2 text-center text-[10px] text-slate-400 space-y-0.5">
              <p>Diproses oleh: <strong>{selectedReceipt.processed_by || 'Resepsionis'}</strong></p>
              <p>© {new Date().getFullYear()} Graha Aisyah Menteng. Terima kasih atas kunjungan Anda.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
