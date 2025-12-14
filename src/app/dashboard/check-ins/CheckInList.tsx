'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { approveCheckIn, rejectCheckIn, assignRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function CheckInList({ 
  initialCheckIns, 
  availableRooms,
  userRole,
  userBranchId 
}: { 
  initialCheckIns: any[]
  availableRooms: any[]
  userRole: string | null
  userBranchId: string | null
}) {
  const [checkIns, setCheckIns] = useState(initialCheckIns)
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const router = useRouter()

  const [approveState, approveAction] = useActionState(approveCheckIn, null)
  const [rejectState, rejectAction] = useActionState(rejectCheckIn, null)
  const [assignState, assignAction] = useActionState(assignRoom, null)

  useEffect(() => {
    setCheckIns(initialCheckIns)
  }, [initialCheckIns])

  useEffect(() => {
    if (approveState?.success || rejectState?.success || assignState?.success) {
      setIsDetailModalOpen(false)
      setIsAssignModalOpen(false)
      router.refresh()
    }
  }, [approveState, rejectState, assignState, router])

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

  // Helper function to get room info with branch
  const getRoomInfo = (checkIn: any) => {
    if (checkIn.assigned_room_id && checkIn.rooms) {
      const branchName = checkIn.rooms.floors?.branches?.name || checkIn.branches?.name || '-'
      return `No. ${checkIn.rooms.room_number} - ${branchName}`
    }
    return checkIn.selected_room_type || '-'
  }

  const headers = ['Nama', 'No. Telepon', 'Kamar Dipilih', 'Durasi Sewa', 'Total', 'Status', 'Tanggal', 'Aksi']
  const rows = checkIns.map(checkIn => [
    checkIn.full_name,
    checkIn.phone,
    getRoomInfo(checkIn),
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
            <button
              type="submit"
              className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
            >
              Setujui
            </button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="check_in_id" value={checkIn.id} />
            <button
              type="submit"
              className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
            >
              Tolak
            </button>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Check-in</h1>
        <p className="text-gray-600">Kelola permintaan check-in dari QR code</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      <Table headers={headers} rows={rows} />

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
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_number} - {room.floors?.name} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price)}
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
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700"
            >
              Assign Kamar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

