'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, deleteRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'

export default function RoomList({ initialRooms, initialFloors, initialBranches, userRole }: { initialRooms: any[], initialFloors: any[], initialBranches: any[], userRole: string | null }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [floors, setFloors] = useState(initialFloors)
  const [branches, setBranches] = useState(initialBranches)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createState, createAction] = useActionState(createRoom, null)
  const [deleteState, deleteAction] = useActionState(deleteRoom, null)
  const router = useRouter()

  // Sync state with props when they change (after refresh)
  useEffect(() => {
    setRooms(initialRooms)
    setFloors(initialFloors)
    setBranches(initialBranches)
  }, [initialRooms, initialFloors, initialBranches])

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [createState, router])

  useEffect(() => {
    if (deleteState?.success) {
      router.refresh()
    }
  }, [deleteState, router])

  const filteredRooms = selectedBranch ? rooms.filter(r => r.floors?.branches?.name === selectedBranch) : rooms

  const headers = ['No. Kamar', 'Lantai', 'Harga', 'Fasilitas', 'Status', 'Actions']
  const rows = filteredRooms.map(room => [
    room.room_number,
    room.floors?.name || 'Unknown',
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price),
    room.facilities?.join(', ') || '',
    room.is_occupied ? 'Terisi' : 'Kosong',
    <form action={deleteAction} key={room.id}>
      <input type="hidden" name="id" value={room.id} />
      <SubmitButton
        variant="danger"
        className="px-4 py-2 text-sm font-medium"
        loadingText="Menghapus..."
      >
        Hapus
      </SubmitButton>
    </form>
  ])

  // Group floors by branch
  const floorsByBranch = branches.map(branch => ({
    ...branch,
    floors: floors.filter(f => f.branch_id === branch.id)
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Kamar</h1>
          <p className="text-gray-600">Kelola data kamar dan fasilitas</p>
        </div>
        {userRole === 'owner' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kamar
          </button>
        )}
      </div>
      
      {userRole === 'owner' && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter berdasarkan Cabang</label>
          <select 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)} 
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="">Semua Cabang</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.name}>{branch.name}</option>
            ))}
          </select>
        </div>
      )}
      
      <Table headers={headers} rows={rows} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Kamar Baru</h2>
        <form action={createAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lantai</label>
            <select 
              name="floor_id" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              aria-label="Pilih lantai"
            >
              <option value="">Pilih Lantai</option>
              {floorsByBranch.length === 0 ? (
                <option value="" disabled>Tidak ada lantai tersedia</option>
              ) : (
                floorsByBranch.map((branch: any) => (
                  <optgroup key={branch.id} label={branch.name}>
                    {branch.floors.length === 0 ? (
                      <option value="" disabled>Tidak ada lantai di cabang ini</option>
                    ) : (
                      branch.floors.map((floor: any) => (
                        <option key={floor.id} value={floor.id}>{floor.name}</option>
                      ))
                    )}
                  </optgroup>
                ))
              )}
            </select>
            {floorsByBranch.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">Belum ada lantai. Silakan tambah lantai terlebih dahulu.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Kamar</label>
            <input 
              name="room_number" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              placeholder="Masukkan nomor kamar" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Harga (Rp)</label>
            <input 
              name="price" 
              type="number" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              placeholder="Masukkan harga kamar" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fasilitas</label>
            <textarea 
              name="facilities" 
              placeholder="Pisahkan dengan koma, misal: AC, Kasur, WiFi" 
              required 
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            ></textarea>
            <p className="mt-1 text-xs text-gray-500">Contoh: AC, Kasur, WiFi, Kamar Mandi Dalam</p>
          </div>
          {createState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{createState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Menambahkan..."
            >
              Tambah Kamar
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}