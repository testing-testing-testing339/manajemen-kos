'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment, confirmPayment } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import Invoice from '@/components/Invoice'

export default function PaymentList({ initialTenants, initialPayments }: { initialTenants: any[], initialPayments: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  const [payments, setPayments] = useState(initialPayments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoicePayment, setInvoicePayment] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
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

  // OPTIMIZATION: Memoize payment status calculations
  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Helper function to check if tenant has paid for current period
  // OPTIMIZATION: Create a Set of paid tenant IDs for faster lookup
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
    const dueDate = new Date(tenant.payment_due_date)
    const hasPaid = paidTenantIds.has(tenant.id)
    const isOverdue = dueDate < today && !hasPaid
    return { hasPaid, isOverdue, dueDate }
  }

  // OPTIMIZATION: Memoize statistics calculations
  const statistics = useMemo(() => {
    const totalTenants = tenants.length
    const paidTenants = tenants.filter(t => getPaymentStatus(t).hasPaid).length
    const unpaidTenants = totalTenants - paidTenants
    const overdueTenants = tenants.filter(t => getPaymentStatus(t).isOverdue).length
    
    // Only count confirmed payments for revenue
    const confirmedPayments = payments.filter((p: any) => {
      return p.status === undefined || p.status === null || p.status === 'confirmed'
    })
    const totalRevenue = confirmedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
    const monthlyRevenue = confirmedPayments
      .filter((p: any) => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear
      })
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
    
    return { totalTenants, paidTenants, unpaidTenants, overdueTenants, totalRevenue, monthlyRevenue }
  }, [tenants, payments, paidTenantIds, currentMonth, currentYear, today])
  
  const { totalTenants, paidTenants, unpaidTenants, overdueTenants, totalRevenue, monthlyRevenue } = statistics

  // OPTIMIZATION: Memoize table rows to prevent unnecessary re-renders
  const headers = useMemo(() => ['Nama Penghuni', 'Kamar', 'Harga Sewa', 'Jatuh Tempo', 'Status Pembayaran', 'Aksi'], [])
  const rows = useMemo(() => tenants.map(tenant => {
    const status = getPaymentStatus(tenant)
    const roomLabel = `No. ${tenant.rooms?.room_number} - ${tenant.rooms?.floors?.branches?.name}`
    // Use total_amount from check_in_request if available, otherwise use room price
    const price = tenant.check_in_request?.total_amount 
      ? parseFloat(tenant.check_in_request.total_amount)
      : (tenant.rooms?.price || 0)

    let statusBadge
    if (status.hasPaid) {
      statusBadge = (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1 w-fit">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Lunas
        </span>
      )
    } else if (status.isOverdue) {
      statusBadge = (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-1 w-fit">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Terlambat
        </span>
      )
    } else {
      statusBadge = (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold flex items-center gap-1 w-fit">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Belum Bayar
        </span>
      )
    }

    return [
      tenant.full_name,
      roomLabel,
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(price),
      <span key={`due-${tenant.id}`} className={status.isOverdue ? 'text-red-600 font-semibold' : ''}>
        {status.dueDate.toLocaleDateString('id-ID')}
      </span>,
      statusBadge,
      <button
        key={`btn-${tenant.id}`}
        onClick={() => {
          setSelectedTenant(tenant)
          setIsModalOpen(true)
        }}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
      >
        {status.hasPaid ? 'Lihat Detail' : 'Tandai Bayar'}
      </button>
    ]
  }), [tenants, paidTenantIds, today])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">GA</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manajemen Pembayaran</h1>
              <p className="text-gray-600">Graha Aisyah Mainframe System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Pendapatan</h3>
            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Pendapatan Bulan Ini</h3>
            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlyRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Sudah Bayar</h3>
            <svg className="w-6 h-6 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{paidTenants} / {totalTenants}</p>
          <p className="text-sm opacity-80 mt-1">{totalTenants > 0 ? Math.round((paidTenants / totalTenants) * 100) : 0}%</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Terlambat Bayar</h3>
            <svg className="w-6 h-6 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{overdueTenants}</p>
          <p className="text-sm opacity-80 mt-1">Perlu perhatian</p>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table headers={headers} rows={rows} />
      </div>

      {/* Pending Payments Section */}
      {payments.filter((p: any) => p.status === 'pending' || (p.status === undefined && p.confirmed_by === null)).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pembayaran Menunggu Konfirmasi</h2>
          <div className="space-y-3">
            {payments
              .filter((p: any) => p.status === 'pending' || (p.status === undefined && p.confirmed_by === null))
              .map((payment: any) => {
                // Get tenant info from payment relation or from tenants list
                const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                const checkInRequest = payment.check_in_request
                
                // Determine tenant name: from tenant, check-in request, or fallback
                let tenantName = 'Unknown'
                if (tenant?.full_name) {
                  tenantName = tenant.full_name
                } else if (checkInRequest?.full_name) {
                  tenantName = checkInRequest.full_name
                } else if (payment.tenant_id) {
                  tenantName = 'Tenant sudah checkout'
                }
                
                // Determine room info
                let roomInfo = 'Kamar tidak tersedia'
                if (tenant?.rooms) {
                  roomInfo = `No. ${tenant.rooms.room_number} - ${tenant.rooms.floors?.branches?.name}`
                } else if (checkInRequest?.rooms) {
                  roomInfo = `No. ${checkInRequest.rooms.room_number} - ${checkInRequest.rooms.floors?.branches?.name || ''}`
                }
                
                return (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{tenantName}</p>
                      {tenant && <p className="text-xs text-gray-500">{roomInfo}</p>}
                      <p className="text-sm text-gray-600 mt-1">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(payment.amount))}
                        {' • '}
                        {new Date(payment.payment_date).toLocaleDateString('id-ID')}
                        {' • '}
                        {payment.payment_method}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-gray-500 mt-1">Catatan: {payment.notes}</p>
                      )}
                    </div>
                    <form action={confirmAction}>
                      <input type="hidden" name="payment_id" value={payment.id} />
                      <SubmitButton
                        variant="success"
                        className="px-4 py-2"
                        loadingText="Mengonfirmasi..."
                      >
                        Konfirmasi Pembayaran
                      </SubmitButton>
                    </form>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* All Payments History Section - Including checkout tenants */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Riwayat Semua Pembayaran</h2>
            <p className="text-sm text-gray-600">
              Menampilkan semua pembayaran termasuk dari penyewa yang sudah checkout
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari nama penghuni atau kamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
            />
          </div>
          
          {/* Date Filter */}
          <div className="relative sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
            />
          </div>

          {/* Reset Filter Button */}
          {(searchQuery || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setDateFilter('')
              }}
              className="px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama Penghuni</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Kamar</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Jumlah</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Metode</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Dikonfirmasi Oleh</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Detail Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {useMemo(() => {
                let filteredPayments = payments.filter((p: any) => p.status === 'confirmed' || (p.status === undefined && p.confirmed_by !== null))
                
                // Filter by search query
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase().trim()
                  filteredPayments = filteredPayments.filter((payment: any) => {
                    const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                    const checkInRequest = payment.check_in_request
                    const tenantName = tenant?.full_name || checkInRequest?.full_name || ''
                    const roomInfo = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || ''
                    return tenantName.toLowerCase().includes(query) || roomInfo.toLowerCase().includes(query)
                  })
                }
                
                // Filter by date
                if (dateFilter) {
                  filteredPayments = filteredPayments.filter((payment: any) => {
                    const paymentDate = new Date(payment.payment_date).toISOString().split('T')[0]
                    return paymentDate === dateFilter
                  })
                }
                
                return filteredPayments
              }, [payments, searchQuery, dateFilter, tenants]).map((payment: any) => {
                  // Get tenant info from payment relation or from tenants list
                  const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                  
                  // Get check-in request data if available (for checkout tenants)
                  const checkInRequest = payment.check_in_request
                  
                  // Determine tenant name: from tenant, check-in request, or fallback
                  let tenantName = 'Unknown'
                  if (tenant?.full_name) {
                    tenantName = tenant.full_name
                  } else if (checkInRequest?.full_name) {
                    tenantName = checkInRequest.full_name
                  } else if (payment.tenant_id) {
                    tenantName = 'Tenant sudah checkout'
                  }
                  
                  // Determine room info
                  let roomInfo = '-'
                  if (tenant?.rooms) {
                    roomInfo = `No. ${tenant.rooms.room_number} - ${tenant.rooms.floors?.branches?.name || ''}`
                  } else if (checkInRequest?.rooms) {
                    roomInfo = `No. ${checkInRequest.rooms.room_number} - ${checkInRequest.rooms.floors?.branches?.name || ''}`
                  } else if (payment.tenant_id) {
                    roomInfo = 'Kamar tidak tersedia'
                  }
                  
                  // Get confirmed by name - check if profiles data exists
                  let confirmedByName = '-'
                  if (payment.profiles && payment.profiles.full_name) {
                    confirmedByName = payment.profiles.full_name
                  } else if (payment.confirmed_by) {
                    // If we have confirmed_by but no profiles, it means fetch failed
                    confirmedByName = '-' // Keep as '-' since we don't have the data
                  }
                  
                  // Debug log in development
                  if (process.env.NODE_ENV === 'development' && payment.confirmed_by) {
                    if (!payment.profiles) {
                      console.log('Payment has confirmed_by but no profiles data:', {
                        paymentId: payment.id,
                        confirmed_by: payment.confirmed_by,
                        profiles: payment.profiles
                      })
                    } else {
                      console.log('Payment profiles data:', {
                        paymentId: payment.id,
                        confirmed_by: payment.confirmed_by,
                        profileName: payment.profiles.full_name
                      })
                    }
                  }
                  const paymentProofUrl = checkInRequest?.payment_proof_url || null
                  
                  return (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {new Date(payment.payment_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900">{tenantName}</span>
                        {!tenant && payment.tenant_id && (
                          <span className="ml-2 text-xs text-gray-500">(Sudah checkout)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{roomInfo}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-gray-900">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(payment.amount))}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">{payment.payment_method}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Dikonfirmasi
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{confirmedByName}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment)
                              setIsDetailModalOpen(true)
                            }}
                            className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition-all duration-150 active:scale-95 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Detail
                          </button>
                          <button
                            onClick={() => {
                              setInvoicePayment(payment)
                              setIsInvoiceModalOpen(true)
                            }}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-semibold hover:bg-green-200 transition-all duration-150 active:scale-95 flex items-center gap-1"
                            title="Cetak Invoice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              {(() => {
                let filtered = payments.filter((p: any) => p.status === 'confirmed' || (p.status === undefined && p.confirmed_by !== null))
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase().trim()
                  filtered = filtered.filter((payment: any) => {
                    const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                    const checkInRequest = payment.check_in_request
                    const tenantName = tenant?.full_name || checkInRequest?.full_name || ''
                    const roomInfo = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || ''
                    return tenantName.toLowerCase().includes(query) || roomInfo.toLowerCase().includes(query)
                  })
                }
                if (dateFilter) {
                  filtered = filtered.filter((payment: any) => {
                    const paymentDate = new Date(payment.payment_date).toISOString().split('T')[0]
                    return paymentDate === dateFilter
                  })
                }
                return filtered.length === 0
              })() && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    {searchQuery || dateFilter ? 'Tidak ada pembayaran yang sesuai dengan filter' : 'Belum ada pembayaran yang dikonfirmasi'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false)
        setSelectedTenant(null)
      }}>
        {selectedTenant && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {getPaymentStatus(selectedTenant).hasPaid ? 'Detail Pembayaran' : 'Tandai Pembayaran'}
            </h2>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Nama Penghuni</p>
              <p className="font-semibold text-gray-900">{selectedTenant.full_name}</p>
              <p className="text-sm text-gray-600 mb-1 mt-3">Kamar</p>
              <p className="font-semibold text-gray-900">
                No. {selectedTenant.rooms?.room_number} - {selectedTenant.rooms?.floors?.branches?.name}
              </p>
              <p className="text-sm text-gray-600 mb-1 mt-3">Harga Sewa</p>
              <p className="font-semibold text-gray-900 text-lg">
                {selectedTenant.check_in_request?.total_amount 
                  ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(selectedTenant.check_in_request.total_amount))
                  : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedTenant.rooms?.price || 0)
                }
              </p>
              {selectedTenant.check_in_request && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedTenant.check_in_request.rental_duration === 'daily' 
                    ? `Sewa Harian (${selectedTenant.check_in_request.rental_days} hari)`
                    : 'Sewa Bulanan (6 bulan)'
                  }
                </p>
              )}
            </div>
            {!getPaymentStatus(selectedTenant).hasPaid ? (
              <form action={paymentAction} className="space-y-5">
                <input type="hidden" name="tenant_id" value={selectedTenant.id} />
                <input type="hidden" name="amount" value={selectedTenant.check_in_request?.total_amount || selectedTenant.rooms?.price || 0} />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Pembayaran</label>
                  <input 
                    name="payment_date" 
                    type="date" 
                    required 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Metode Pembayaran</label>
                  <select 
                    name="payment_method" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="">Pilih Metode</option>
                    <option value="cash">Tunai</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="e-wallet">E-Wallet</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan (Opsional)</label>
                  <textarea 
                    name="notes" 
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tambahkan catatan jika diperlukan"
                  ></textarea>
                </div>
                {paymentState?.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{paymentState.error}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setSelectedTenant(null)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <SubmitButton
                    variant="success"
                    className="flex-1 px-4 py-3"
                    loadingText="Menyimpan..."
                  >
                    Tandai Sudah Bayar
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-semibold">✓ Pembayaran sudah tercatat</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setIsModalOpen(false)
                      setSelectedTenant(null)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Payment Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => {
        setIsDetailModalOpen(false)
        setSelectedPayment(null)
      }}>
        {selectedPayment && (() => {
          const tenant = selectedPayment.tenants || tenants.find((t: any) => t.id === selectedPayment.tenant_id)
          const checkInRequest = selectedPayment.check_in_request
          
          // Get tenant name
          const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Unknown'
          
          // Get room info
          let roomInfo = '-'
          if (tenant?.rooms) {
            roomInfo = `No. ${tenant.rooms.room_number} - ${tenant.rooms.floors?.branches?.name || ''}`
          } else if (checkInRequest?.rooms) {
            roomInfo = `No. ${checkInRequest.rooms.room_number} - ${checkInRequest.rooms.floors?.branches?.name || ''}`
          }
          
          // Get assigned date (checkout date)
          const assignedAt = checkInRequest?.assigned_at || tenant?.check_in_date
          let assignedDateStr = '-'
          let assignedDayStr = '-'
          let assignedTimeStr = '-'
          if (assignedAt) {
            const assignedDate = new Date(assignedAt)
            assignedDateStr = assignedDate.toLocaleDateString('id-ID', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
            assignedDayStr = assignedDate.toLocaleDateString('id-ID', { weekday: 'long' })
            assignedTimeStr = assignedDate.toLocaleTimeString('id-ID', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }
          
          // Get rental duration
          let rentalDurationStr = '-'
          if (checkInRequest?.rental_duration === 'daily' && checkInRequest?.rental_days) {
            rentalDurationStr = `Sewa Harian (${checkInRequest.rental_days} hari)`
          } else if (checkInRequest?.rental_duration === 'monthly' || checkInRequest?.rental_duration === '6months') {
            rentalDurationStr = 'Sewa Bulanan (6 bulan)'
          }
          
          // Get NIK
          const nik = checkInRequest?.id_card_number || tenant?.id_card_number || '-'
          
          // Get payment proof URL
          const paymentProofUrl = checkInRequest?.payment_proof_url || null
          
          return (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Detail Transaksi</h2>
              
              {/* Transaction Details */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Nama</p>
                  <p className="font-semibold text-gray-900 text-lg">{tenantName}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Kamar yang Diassign</p>
                  <p className="font-semibold text-gray-900">{roomInfo}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tanggal Checkout</p>
                  <p className="font-semibold text-gray-900">
                    {assignedDateStr !== '-' ? `${assignedDayStr}, ${assignedDateStr}` : '-'}
                  </p>
                  {assignedTimeStr !== '-' && (
                    <p className="text-sm text-gray-600 mt-1">Pukul {assignedTimeStr} WIB</p>
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Durasi Sewa</p>
                  <p className="font-semibold text-gray-900">{rentalDurationStr}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">NIK</p>
                  <p className="font-semibold text-gray-900">{nik}</p>
                </div>
              </div>
              
              {/* Payment Proof Image */}
              {paymentProofUrl ? (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Foto Bukti Transfer</p>
                  <div className="relative w-full max-w-2xl mx-auto">
                    <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={paymentProofUrl}
                        alt="Bukti Transfer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-image.png'
                          target.alt = 'Gambar tidak dapat dimuat'
                        }}
                      />
                    </div>
                    <div className="mt-3 flex justify-center gap-3">
                      <a
                        href={paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-150 active:scale-95 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Buka di Tab Baru
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">Bukti transfer tidak tersedia</p>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setSelectedPayment(null)
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-150 active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </>
          )
        })()}
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => {
        setIsInvoiceModalOpen(false)
        setInvoicePayment(null)
      }} size="large">
        {invoicePayment && (() => {
          const tenant = invoicePayment.tenants || tenants.find((t: any) => t.id === invoicePayment.tenant_id)
          const checkInRequest = invoicePayment.check_in_request
          const confirmedBy = invoicePayment.profiles
          
          return (
            <div className="max-h-[90vh] overflow-y-auto">
              <Invoice 
                payment={invoicePayment}
                tenant={tenant}
                checkInRequest={checkInRequest}
                confirmedBy={confirmedBy}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsInvoiceModalOpen(false)
                    setInvoicePayment(null)
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-150 active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

