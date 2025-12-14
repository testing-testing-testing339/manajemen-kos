'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment, confirmPayment } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function PaymentList({ initialTenants, initialPayments }: { initialTenants: any[], initialPayments: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  const [payments, setPayments] = useState(initialPayments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
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

  // Helper function to check if tenant has paid for current period
  const getPaymentStatus = (tenant: any) => {
    const today = new Date()
    const dueDate = new Date(tenant.payment_due_date)
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // Check if there's a CONFIRMED payment for current month/year
    // If status column doesn't exist, treat all payments as confirmed (backward compatibility)
    const hasPaid = payments.some((payment: any) => {
      const paymentDate = new Date(payment.payment_date)
      // If status is undefined/null, treat as confirmed (backward compatibility)
      const isConfirmed = payment.status === undefined || payment.status === null || payment.status === 'confirmed'
      return (
        payment.tenant_id === tenant.id &&
        isConfirmed &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      )
    })

    const isOverdue = dueDate < today && !hasPaid

    return { hasPaid, isOverdue, dueDate }
  }

  // Calculate statistics
  const totalTenants = tenants.length
  const paidTenants = tenants.filter(t => getPaymentStatus(t).hasPaid).length
  const unpaidTenants = totalTenants - paidTenants
  const overdueTenants = tenants.filter(t => getPaymentStatus(t).isOverdue).length
  
  // Only count confirmed payments for revenue
  // If status column doesn't exist, treat all payments as confirmed (backward compatibility)
  const confirmedPayments = payments.filter((p: any) => {
    return p.status === undefined || p.status === null || p.status === 'confirmed'
  })
  const totalRevenue = confirmedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
  const monthlyRevenue = confirmedPayments
    .filter((p: any) => {
      const paymentDate = new Date(p.payment_date)
      const today = new Date()
      return paymentDate.getMonth() === today.getMonth() && 
             paymentDate.getFullYear() === today.getFullYear()
    })
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)

  const headers = ['Nama Penghuni', 'Kamar', 'Harga Sewa', 'Jatuh Tempo', 'Status Pembayaran', 'Actions']
  const rows = tenants.map(tenant => {
    const status = getPaymentStatus(tenant)
    const roomLabel = `No. ${tenant.rooms?.room_number} - ${tenant.rooms?.floors?.branches?.name}`
    const price = tenant.rooms?.price || 0

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
  })

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
      {payments.filter((p: any) => p.status === 'pending').length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pembayaran Menunggu Konfirmasi</h2>
          <div className="space-y-3">
            {payments
              .filter((p: any) => p.status === 'pending' || (p.status === undefined && p.confirmed_by === null))
              .map((payment: any) => {
                const tenant = tenants.find((t: any) => t.id === payment.tenant_id)
                return (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{tenant?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
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
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-150 active:scale-95"
                      >
                        Konfirmasi Pembayaran
                      </button>
                    </form>
                  </div>
                )
              })}
          </div>
        </div>
      )}

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
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedTenant.rooms?.price || 0)}
              </p>
            </div>
            {!getPaymentStatus(selectedTenant).hasPaid ? (
              <form action={paymentAction} className="space-y-5">
                <input type="hidden" name="tenant_id" value={selectedTenant.id} />
                <input type="hidden" name="amount" value={selectedTenant.rooms?.price || 0} />
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
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                  >
                    Tandai Sudah Bayar
                  </button>
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
    </div>
  )
}

