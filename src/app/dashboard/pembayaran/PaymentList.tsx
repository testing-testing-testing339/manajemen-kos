'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment, confirmPayment } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import Invoice from '@/components/Invoice'
import { 
  CreditCard, 
  Banknote, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Receipt, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Users, 
  Eye, 
  ChevronRight,
  Sparkles,
  Download
} from 'lucide-react'

type TabType = 'history' | 'tenants_status' | 'pending_confirmation'

export default function PaymentList({ initialTenants, initialPayments }: { initialTenants: any[], initialPayments: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  const [payments, setPayments] = useState(initialPayments)
  const [activeTab, setActiveTab] = useState<TabType>('history')
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoicePayment, setInvoicePayment] = useState<any>(null)
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  const [paymentState, paymentAction] = useActionState(recordPayment, null)
  const [confirmState, confirmAction] = useActionState(confirmPayment, null)
  const router = useRouter()

  // Sync state with props
  useEffect(() => {
    setTenants(initialTenants)
    setPayments(initialPayments)
  }, [initialTenants, initialPayments])

  useEffect(() => {
    if (paymentState?.success || confirmState?.success) {
      setIsModalOpen(false)
      setSelectedTenant(null)
      router.refresh()
    }
  }, [paymentState, confirmState, router])

  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Set of paid tenant IDs
  const paidTenantIds = useMemo(() => {
    const paidIds = new Set<string>()
    payments.forEach((payment: any) => {
      const paymentDate = new Date(payment.payment_date)
      const isConfirmed = payment.status === undefined || payment.status === null || payment.status === 'confirmed'
      if (
        isConfirmed &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        payment.tenant_id
      ) {
        paidIds.add(payment.tenant_id)
      }
    })
    return paidIds
  }, [payments, currentMonth, currentYear])
  
  const getPaymentStatus = (tenant: any) => {
    const dueDate = new Date(tenant.payment_due_date || tenant.check_in_date)
    const hasPaid = paidTenantIds.has(tenant.id)
    const isOverdue = dueDate < today && !hasPaid
    return { hasPaid, isOverdue, dueDate }
  }

  // Financial Statistics
  const stats = useMemo(() => {
    const totalTenants = tenants.length
    const paidTenants = tenants.filter(t => getPaymentStatus(t).hasPaid).length
    const overdueTenants = tenants.filter(t => getPaymentStatus(t).isOverdue).length
    
    const confirmedPayments = payments.filter((p: any) => {
      return p.status === undefined || p.status === null || p.status === 'confirmed'
    })

    let totalDeposit = 0
    let totalRentRevenue = 0
    let monthlyRentRevenue = 0

    confirmedPayments.forEach((p: any) => {
      const amount = parseFloat(p.amount) || 0
      let deposit = parseFloat(p.check_in_request?.deposit_amount || p.deposit_amount || 0)
      if (deposit === 0 && amount >= 200000) {
        deposit = 100000
      }
      
      const rent = (deposit > 0 && amount > deposit) ? (amount - deposit) : amount
      
      totalDeposit += deposit
      totalRentRevenue += rent

      const paymentDate = new Date(p.payment_date || p.created_at)
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        monthlyRentRevenue += rent
      }
    })
    
    const pendingCount = payments.filter((p: any) => p.status === 'pending' || (p.status === undefined && p.confirmed_by === null)).length

    return { totalTenants, paidTenants, overdueTenants, totalRentRevenue, totalDeposit, monthlyRentRevenue, pendingCount }
  }, [tenants, payments, paidTenantIds, currentMonth, currentYear, today])

  // Filtered Payments History
  const filteredPayments = useMemo(() => {
    return payments.filter((payment: any) => {
      const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
      const checkInRequest = payment.check_in_request
      const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
      const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || ''
      const invoiceCode = `INV-${payment.id?.substring(0, 8)}`

      const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
        (payment.payment_method || '').toLowerCase().includes('tunai') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
        payment.notes?.toLowerCase().includes('tunai')

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        tenantName.toLowerCase().includes(q) ||
        roomNumber.toString().toLowerCase().includes(q) ||
        invoiceCode.toLowerCase().includes(q) ||
        (payment.notes && payment.notes.toLowerCase().includes(q))

      let matchesDate = true
      if (dateFilter) {
        const pDate = new Date(payment.payment_date || payment.created_at).toISOString().split('T')[0]
        matchesDate = pDate === dateFilter
      }

      let matchesMethod = true
      if (methodFilter === 'cash') {
        matchesMethod = isCash
      } else if (methodFilter === 'transfer') {
        matchesMethod = !isCash
      }

      return matchesSearch && matchesDate && matchesMethod
    })
  }, [payments, tenants, searchQuery, dateFilter, methodFilter])

  // Helper method badge
  const getMethodBadge = (payment: any) => {
    const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
      (payment.payment_method || '').toLowerCase().includes('tunai') ||
      payment.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
      payment.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
      payment.notes?.toLowerCase().includes('tunai')

    if (isCash) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <Banknote className="w-3 h-3 text-amber-600" />
          <span>Tunai Resepsionis</span>
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
        <CreditCard className="w-3 h-3 text-indigo-600" />
        <span>QRIS GoPay</span>
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pembayaran & Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Graha Aisyah Menteng • Rekap penerimaan sewa, kuitansi digital, dan status tagihan penghuni
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Graha Aisyah Menteng (53 Kamar)</span>
          </span>
        </div>
      </div>

      {/* Modern Luxury Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan Sewa Murni */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 text-white shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pendapatan Sewa Murni</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRentRevenue)}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Eksklusif Uang Deposit</span>
            </p>
          </div>
        </div>

        {/* Pendapatan Bulan Ini */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pendapatan Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.monthlyRentRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Periode {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Titipan Deposit (Refundable) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Titipan Uang Deposit</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalDeposit)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Dikembalikan saat checkout</p>
          </div>
        </div>

        {/* Kepatuhan Bayar Penghuni */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Penghuni Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.paidTenants}
                <span className="text-sm font-bold text-slate-400"> / {stats.totalTenants}</span>
              </p>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {stats.totalTenants > 0 ? Math.round((stats.paidTenants / stats.totalTenants) * 100) : 100}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status tagihan sewa lunas</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex max-w-md border border-slate-200/80">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Riwayat Transaksi</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tenants_status')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tenants_status'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-slate-600" />
          <span>Tagihan Penghuni</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {tenants.length}
          </span>
        </button>

        {stats.pendingCount > 0 && (
          <button
            onClick={() => setActiveTab('pending_confirmation')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pending_confirmation'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Verifikasi ({stats.pendingCount})</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: RIWAYAT TRANSAKSI & KUITANSI
      ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama penghuni, kamar, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Metode</option>
                <option value="transfer">QRIS / Bank Transfer</option>
                <option value="cash">Tunai Resepsionis</option>
              </select>

              {(searchQuery || dateFilter || methodFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setDateFilter('')
                    setMethodFilter('all')
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          {filteredPayments.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Transaksi</th>
                    <th className="py-3 px-4">Nama Penghuni</th>
                    <th className="py-3 px-4">Kamar</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Dikonfirmasi Oleh</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {filteredPayments.map((payment: any) => {
                    const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                    const checkInRequest = payment.check_in_request
                    const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
                    const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
                    const roomType = tenant?.rooms?.room_type === 'vip' ? 'VIP' : 'Standard'
                    const isConfirmed = payment.status === undefined || payment.status === null || payment.status === 'confirmed'

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {new Date(payment.payment_date || payment.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{tenantName}</p>
                          <p className="text-[10px] font-mono text-slate-400">INV-{payment.id?.substring(0, 8).toUpperCase()}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs">
                            {roomNumber !== '-' ? `Kamar ${roomNumber}` : 'Kamar -'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {(() => {
                            const totalAmount = parseFloat(payment.amount) || 0
                            let depositAmount = parseFloat(payment.check_in_request?.deposit_amount || payment.deposit_amount || 0)
                            if (depositAmount === 0 && totalAmount >= 200000) {
                              depositAmount = 100000
                            }
                            const rentAmount = (depositAmount > 0 && totalAmount > depositAmount) ? (totalAmount - depositAmount) : totalAmount
                            
                            return (
                              <div>
                                <p className="font-mono font-extrabold text-indigo-600 text-sm">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentAmount)}
                                </p>
                                {depositAmount > 0 && (
                                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                    + {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(depositAmount)} (Deposit)
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </td>

                        <td className="py-3.5 px-4">
                          {getMethodBadge(payment)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isConfirmed 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isConfirmed ? 'Dikonfirmasi' : 'Menunggu'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {payment.profiles?.full_name || 'Admin Graha Menteng'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsDetailModalOpen(true)
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setInvoicePayment(payment)
                                setIsInvoiceModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center border border-slate-200 rounded-2xl bg-slate-50">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Tidak ada riwayat pembayaran yang sesuai</h3>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter tanggal.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: STATUS TAGIHAN PENGHUNI AKTIF
      ========================================================================= */}
      {activeTab === 'tenants_status' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Status Tagihan Penghuni Aktif</h2>
              <p className="text-xs text-slate-400">Jadwal jatuh tempo sewa dan catatan pembayaran per kamar</p>
            </div>
          </div>

          {tenants.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold tracking-wider uppercase">
                    <th className="py-3.5 px-4">Nama Penghuni</th>
                    <th className="py-3.5 px-4">Kamar</th>
                    <th className="py-3.5 px-4">Tanggal Masuk</th>
                    <th className="py-3.5 px-4">Jatuh Tempo</th>
                    <th className="py-3.5 px-4">Status Tagihan</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tenants.map(tenant => {
                    const status = getPaymentStatus(tenant)
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{tenant.full_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs">
                            Kamar {tenant.rooms?.room_number || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {tenant.payment_due_date ? new Date(tenant.payment_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            status.hasPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status.isOverdue 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {status.hasPaid ? 'Lunas' : status.isOverdue ? 'Jatuh Tempo' : 'Menunggu Bayar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant)
                              setIsModalOpen(true)
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Catat Bayar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center border border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-xs text-slate-400">Belum ada data penghuni aktif.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          INVOICE MODAL (CLEAN FULL PREVIEW)
      ========================================================================= */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} size="2xl">
        {invoicePayment && (() => {
          const tenant = invoicePayment.tenants || tenants.find((t: any) => t.id === invoicePayment.tenant_id)
          const checkInRequest = invoicePayment.check_in_request
          const confirmedBy = invoicePayment.profiles

          return (
            <div className="py-2">
              <Invoice
                payment={invoicePayment}
                tenant={tenant}
                checkInRequest={checkInRequest}
                confirmedBy={confirmedBy}
              />
            </div>
          )
        })()}
      </Modal>

      {/* =========================================================================
          PAYMENT DETAIL MODAL WITH PAYMENT PROOF PHOTO
      ========================================================================= */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
        {selectedPayment && (() => {
          const tenant = selectedPayment.tenants || tenants.find((t: any) => t.id === selectedPayment.tenant_id)
          const checkInRequest = selectedPayment.check_in_request
          const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
          const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
          const roomType = (tenant?.rooms?.room_type === 'vip' || roomNumber.toString().includes('vip')) ? 'VIP' : 'Non-VIP / Standard'
          const proofUrl = selectedPayment.payment_proof_url || checkInRequest?.payment_proof_url
          
          const isCash = (selectedPayment.payment_method || '').toLowerCase().includes('cash') || 
            (selectedPayment.payment_method || '').toLowerCase().includes('tunai') ||
            checkInRequest?.payment_destination?.toLowerCase().includes('cash') ||
            checkInRequest?.payment_destination?.toLowerCase().includes('resepsionis') ||
            selectedPayment.notes?.toLowerCase().includes('tunai') ||
            (proofUrl && proofUrl.includes('placehold'))

          const totalAmount = parseFloat(selectedPayment.amount) || 0
          let depositAmount = parseFloat(checkInRequest?.deposit_amount || selectedPayment.deposit_amount || 0)
          if (depositAmount === 0 && totalAmount >= 200000) {
            depositAmount = 100000
          }
          const rentAmount = (depositAmount > 0 && totalAmount > depositAmount) ? (totalAmount - depositAmount) : totalAmount

          return (
            <div className="space-y-5 py-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Detail & Bukti Pembayaran</h2>
                  <p className="text-xs text-slate-400 font-mono">Invoice ID: INV-{selectedPayment.id?.substring(0, 8).toUpperCase()}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200">
                  Dikonfirmasi
                </span>
              </div>

              {/* 2-Column Grid: Transaction Info & Proof Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Transaction Details */}
                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rincian Transaksi</p>
                  
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Nama Penghuni:</span>
                    <span className="font-bold text-slate-900">{tenantName}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Kamar:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      Kamar {roomNumber} ({roomType})
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Sewa Kamar:</span>
                    <span className="font-mono font-extrabold text-indigo-600 text-sm">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentAmount)}
                    </span>
                  </div>

                  {depositAmount > 0 && (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Titipan Deposit:</span>
                      <span className="font-mono font-bold text-amber-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(depositAmount)}
                        <span className="text-[10px] text-slate-400 block font-sans font-normal text-right">(Dikembalikan saat checkout)</span>
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">Total Diterima:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Metode Bayar:</span>
                    <span className="font-bold text-slate-800">{isCash ? 'Tunai di Resepsionis' : 'QRIS GoPay Merchant'}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Tanggal Bayar:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedPayment.payment_date || selectedPayment.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Dikonfirmasi Oleh:</span>
                    <span className="font-bold text-slate-800">{selectedPayment.profiles?.full_name || 'Admin Graha Menteng'}</span>
                  </div>

                  {selectedPayment.notes && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-0.5">Catatan:</span>
                      <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200/80">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Payment Proof Image */}
                <div className="bg-slate-900 rounded-2xl p-3.5 text-white border border-slate-800 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-300">Bukti Transfer / Pembayaran</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${isCash ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {isCash ? 'Tunai' : 'QRIS GoPay'}
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        if (!isCash && proofUrl && !proofUrl.includes('placehold')) {
                          setZoomImage({ url: proofUrl, title: `Bukti Bayar: ${tenantName} (Kamar ${roomNumber})` })
                        }
                      }}
                      className={`relative aspect-[1.4/1] bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center ${!isCash && proofUrl && !proofUrl.includes('placehold') ? 'cursor-pointer hover:opacity-95' : ''}`}
                    >
                      {!isCash && proofUrl && !proofUrl.includes('placehold') ? (
                        <>
                          <img 
                            src={proofUrl} 
                            alt="Bukti Pembayaran" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                              <span>Perbesar Foto</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 space-y-1.5">
                          <Banknote className="w-8 h-8 text-amber-400 mx-auto" />
                          <p className="text-xs font-bold text-amber-300">Pembayaran Tunai di Resepsionis</p>
                          <p className="text-[10px] text-slate-400">Uang tunai diterima langsung oleh staf</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    {proofUrl ? 'Klik foto untuk melihat ukuran penuh' : 'Transaksi tunai terverifikasi sistem'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setInvoicePayment(selectedPayment)
                    setIsInvoiceModalOpen(true)
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Buka Kuitansi / Cetak Invoice</span>
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* =========================================================================
          FULLSCREEN PHOTO ZOOM LIGHTBOX
      ========================================================================= */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl p-2 border border-slate-800 shadow-2xl">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-lg shadow-lg cursor-pointer"
            >
              ✕
            </button>
            <p className="text-xs font-bold text-white p-2 text-center">{zoomImage.title}</p>
            <img 
              src={zoomImage.url} 
              alt="Zoom" 
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain mx-auto" 
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          RECORD PAYMENT MODAL (TANDAI BAYAR)
      ========================================================================= */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        {selectedTenant && (
          <form action={paymentAction} className="space-y-4 py-1">
            <input type="hidden" name="tenant_id" value={selectedTenant.id} />
            
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Catat Pembayaran Sewa</h2>
              <p className="text-xs text-slate-500">
                Penyewa: <strong>{selectedTenant.full_name}</strong> • Kamar <strong>{selectedTenant.rooms?.room_number}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Pembayaran (Rp) *</label>
              <input
                type="number"
                name="amount"
                required
                defaultValue={selectedTenant.rooms?.price || 100000}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pembayaran *</label>
              <input
                type="date"
                name="payment_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran *</label>
              <select
                name="payment_method"
                required
                defaultValue="qris"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="qris">QRIS GoPay Merchant</option>
                <option value="cash">Tunai di Resepsionis</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Pembayaran perpanjangan sewa 1 bulan"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {paymentState?.error && (
              <p className="text-xs text-rose-600 font-semibold">{paymentState.error}</p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="primary"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                loadingText="Menyimpan..."
              >
                Simpan Pembayaran
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
