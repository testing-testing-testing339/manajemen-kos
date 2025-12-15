'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { approveCheckIn, rejectCheckIn, assignRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import QRCode from 'qrcode'

type TabType = 'checkins' | 'qrcode'

export default function CheckInManager({ 
  initialCheckIns, 
  availableRooms,
  branches,
  userRole,
  userBranchId 
}: { 
  initialCheckIns: any[]
  availableRooms: any[]
  branches: any[]
  userRole: string | null
  userBranchId: string | null
}) {
  const [activeTab, setActiveTab] = useState<TabType>('checkins')
  const [checkIns, setCheckIns] = useState(initialCheckIns)
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [approveState, approveAction] = useActionState(approveCheckIn, null)
  const [rejectState, rejectAction] = useActionState(rejectCheckIn, null)
  const [assignState, assignAction] = useActionState(assignRoom, null)

  useEffect(() => {
    setCheckIns(initialCheckIns)
  }, [initialCheckIns])

  // Real-time subscription for check-in requests
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to check-in request changes
    const channel = supabase
      .channel('check-ins-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'check_in_requests',
        },
        (payload) => {
          console.log('Check-in change detected:', payload)
          // Refresh the page to get updated data
          router.refresh()
          
          // Update badge in sidebar
          window.dispatchEvent(new CustomEvent('checkin-updated'))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  useEffect(() => {
    if (approveState?.success || rejectState?.success || assignState?.success) {
      setIsDetailModalOpen(false)
      setIsAssignModalOpen(false)
      router.refresh()
    }
  }, [approveState, rejectState, assignState, router])

  const generateQR = async (branchId: string) => {
    setLoading(true)
    try {
      const siteUrl = window.location.origin
      const checkInUrl = `${siteUrl}/check-in/${branchId}`
      
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrDataUrl)

      const response = await fetch('/api/branch/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          qr_code_data: checkInUrl
        }),
      })

      if (!response.ok) {
        console.error('Failed to save QR code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.download = `qr-code-${selectedBranch}.png`
    link.href = qrCodeUrl
    link.click()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Selesai'}
      </span>
    )
  }

  // Helper function to format rental duration
  const formatRentalDuration = (checkIn: any) => {
    if (checkIn.rental_duration === 'daily' && checkIn.rental_days) {
      return `${checkIn.rental_days} hari`
    } else if (checkIn.rental_duration === '6months') {
      return '6 bulan'
    }
    return '-'
  }

  // Helper function to get branch name
  const getBranchName = (checkIn: any) => {
    return checkIn.branches?.name || '-'
  }

  const headers = ['Nama', 'No. Telepon', 'Cabang Kost Yang Dipesan', 'Durasi Sewa', 'Total', 'Status', 'Tanggal', 'Aksi']
  const rows = checkIns.map(checkIn => [
    checkIn.full_name,
    checkIn.phone,
    getBranchName(checkIn),
    formatRentalDuration(checkIn),
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(checkIn.total_amount)),
    getStatusBadge(checkIn.status),
    new Date(checkIn.created_at).toLocaleDateString('id-ID'),
    <div key={checkIn.id} className="flex gap-2">
      <button
        onClick={() => {
          setSelectedCheckIn(checkIn)
          setIsDetailModalOpen(true)
        }}
        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
      >
        Detail
      </button>
      {checkIn.status === 'pending' && (userRole === 'owner' || (userRole === 'staff' && checkIn.branch_id === userBranchId)) && (
        <>
          <form action={approveAction}>
            <input type="hidden" name="check_in_id" value={checkIn.id} />
            <SubmitButton
              variant="success"
              className="px-3 py-1 text-sm font-medium"
              loadingText="Menyetujui..."
            >
              Setujui
            </SubmitButton>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="check_in_id" value={checkIn.id} />
            <SubmitButton
              variant="danger"
              className="px-3 py-1 text-sm font-medium"
              loadingText="Menolak..."
            >
              Tolak
            </SubmitButton>
          </form>
        </>
      )}
      {checkIn.status === 'approved' && !checkIn.assigned_room_id && (userRole === 'owner' || (userRole === 'staff' && checkIn.branch_id === userBranchId)) && (
        <button
          onClick={() => {
            setSelectedCheckIn(checkIn)
            setIsAssignModalOpen(true)
          }}
          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium"
        >
          Assign Kamar
        </button>
      )}
    </div>
  ])

  const selectedBranchData = branches.find(b => b.id === selectedBranch)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Check-in</h1>
        <p className="text-gray-600">Kelola permintaan check-in dan generate QR code</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('checkins')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'checkins'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            📱 Check-in Requests
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'qrcode'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            📱 QR Generator
          </button>
        </div>
      </div>

      {/* Check-ins Tab */}
      {activeTab === 'checkins' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Permintaan</p>
              <p className="text-2xl font-bold text-gray-900">{checkIns.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Menunggu</p>
              <p className="text-2xl font-bold text-yellow-600">
                {checkIns.filter(c => c.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Disetujui</p>
              <p className="text-2xl font-bold text-blue-600">
                {checkIns.filter(c => c.status === 'approved').length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Selesai</p>
              <p className="text-2xl font-bold text-green-600">
                {checkIns.filter(c => c.status === 'completed').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table headers={headers} rows={rows} />
          </div>
        </div>
      )}

      {/* QR Generator Tab */}
      {activeTab === 'qrcode' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Cabang</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value)
                setQrCodeUrl('')
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          {selectedBranchData && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Cabang: <span className="font-semibold">{selectedBranchData.name}</span></p>
              <p className="text-sm text-gray-600">Alamat: {selectedBranchData.address}</p>
            </div>
          )}

          <button
            onClick={() => generateQR(selectedBranch)}
            disabled={loading || !selectedBranch}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="relative">
                  <div className="h-4 w-4 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 h-4 w-4 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                </div>
                <span>Membuat QR Code...</span>
              </>
            ) : (
              'Generate QR Code'
            )}
          </button>

          {qrCodeUrl && (
            <div className="mt-6 text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-600 mt-4 mb-2">
                Scan QR code ini untuk check-in di cabang <span className="font-semibold">{selectedBranchData?.name}</span>
              </p>
              <button
                onClick={downloadQR}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Download QR Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
        {selectedCheckIn && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Detail Check-in</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nama Lengkap</p>
                <p className="font-semibold">{selectedCheckIn.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">No. Telepon</p>
                <p className="font-semibold">{selectedCheckIn.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{selectedCheckIn.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">No. KTP</p>
                <p className="font-semibold">{selectedCheckIn.id_card_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pembayaran</p>
                <p className="font-semibold text-indigo-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFloat(selectedCheckIn.total_amount))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Durasi Sewa</p>
                <p className="font-semibold">{formatRentalDuration(selectedCheckIn)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                {getStatusBadge(selectedCheckIn.status)}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Foto KTP</p>
              <img src={selectedCheckIn.id_card_photo_url} alt="KTP" className="w-full rounded-lg border-2 border-gray-300" />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Foto Selfie</p>
              <img src={selectedCheckIn.selfie_photo_url} alt="Selfie" className="w-full rounded-lg border-2 border-gray-300" />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Bukti Transfer</p>
              <img src={selectedCheckIn.payment_proof_url} alt="Bukti transfer" className="w-full rounded-lg border-2 border-gray-300" />
            </div>

            {selectedCheckIn.assigned_room_id && (
              <div>
                <p className="text-sm text-gray-600">Kamar yang Ditetapkan</p>
                <p className="font-semibold">
                  No. {selectedCheckIn.rooms?.room_number || '-'} - {selectedCheckIn.rooms?.floors?.branches?.name || selectedCheckIn.branches?.name || '-'}
                </p>
              </div>
            )}

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Tutup
            </button>
          </div>
        )}
      </Modal>

      {/* Assign Room Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)}>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Assign Kamar</h2>
        <form action={assignAction} className="space-y-4">
          <input type="hidden" name="check_in_id" value={selectedCheckIn?.id} />
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Kamar *</label>
            <select
              name="room_id"
              required
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Pilih Kamar</option>
              {[...availableRooms].sort((a, b) => {
                // Sort by room_number (handle both string and number)
                const numA = parseInt(a.room_number) || 0
                const numB = parseInt(b.room_number) || 0
                return numA - numB
              }).map(room => (
                <option key={room.id} value={room.id}>
                  No. {room.room_number} - {room.floors?.branches?.name || '-'} - {room.floors?.name || '-'}
                </option>
              ))}
            </select>
          </div>

          {assignState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{assignState.error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Mengassign..."
            >
              Assign Kamar
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}

