'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { addBranch, deleteBranch, addFloor, deleteFloor, createRoom, deleteRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

type TabType = 'branches' | 'floors' | 'rooms'

export default function PropertiList({
  initialBranches,
  initialFloors,
  initialRooms,
  initialFloorsForRooms,
  userRole
}: {
  initialBranches: any[]
  initialFloors: any[]
  initialRooms: any[]
  initialFloorsForRooms: any[]
  userRole: string | null
}) {
  const [activeTab, setActiveTab] = useState<TabType>('branches')
  const [branches, setBranches] = useState(initialBranches)
  const [floors, setFloors] = useState(initialFloors)
  const [rooms, setRooms] = useState(initialRooms)
  const [floorsForRooms, setFloorsForRooms] = useState(initialFloorsForRooms)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('')
  const router = useRouter()

  const [addBranchState, addBranchAction] = useActionState(addBranch, null)
  const [deleteBranchState, deleteBranchAction] = useActionState(deleteBranch, null)
  const [addFloorState, addFloorAction] = useActionState(addFloor, null)
  const [deleteFloorState, deleteFloorAction] = useActionState(deleteFloor, null)
  const [createRoomState, createRoomAction] = useActionState(createRoom, null)
  const [deleteRoomState, deleteRoomAction] = useActionState(deleteRoom, null)

  useEffect(() => {
    setBranches(initialBranches)
    setFloors(initialFloors)
    setRooms(initialRooms)
    setFloorsForRooms(initialFloorsForRooms)
  }, [initialBranches, initialFloors, initialRooms, initialFloorsForRooms])

  useEffect(() => {
    if (addBranchState?.success || deleteBranchState?.success || 
        addFloorState?.success || deleteFloorState?.success ||
        createRoomState?.success || deleteRoomState?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [addBranchState, deleteBranchState, addFloorState, deleteFloorState, createRoomState, deleteRoomState, router])

  // Group floors by branch
  const floorsByBranch = branches.map(branch => ({
    ...branch,
    floors: floors.filter(f => f.branch_id === branch.id)
  }))

  // Branches table
  const branchHeaders = userRole === 'owner' ? ['Nama', 'Alamat', 'Aksi'] : ['Nama', 'Alamat']
  const branchRows = branches.map(branch => {
    const row = [branch.name, branch.address]
    if (userRole === 'owner') {
      row.push(
        <form action={deleteBranchAction} key={branch.id}>
          <input type="hidden" name="id" value={branch.id} />
          <button 
            type="submit" 
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
          >
            Hapus
          </button>
        </form>
      )
    }
    return row
  })

  // Floors table
  const floorHeaders = userRole === 'owner' ? ['Nama Lantai', 'Cabang', 'Aksi'] : ['Nama Lantai', 'Cabang']
  const floorRows = floors.map(floor => {
    const row = [floor.name, floor.branches?.name || 'Unknown']
    if (userRole === 'owner') {
      row.push(
        <form action={deleteFloorAction} key={floor.id}>
          <input type="hidden" name="id" value={floor.id} />
          <button 
            type="submit" 
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
          >
            Hapus
          </button>
        </form>
      )
    }
    return row
  })

  // Rooms table
  const roomHeaders = userRole === 'owner' ? ['No. Kamar', 'Lantai', 'Harga', 'Fasilitas', 'Status', 'Aksi'] : ['No. Kamar', 'Lantai', 'Harga', 'Fasilitas', 'Status']
  const roomRows = rooms.map(room => {
    const row = [
      room.room_number,
      room.floors?.name || 'Unknown',
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price),
      room.facilities?.join(', ') || '',
      room.is_occupied ? 'Terisi' : 'Kosong'
    ]
    if (userRole === 'owner') {
      row.push(
        <form action={deleteRoomAction} key={room.id}>
          <input type="hidden" name="id" value={room.id} />
          <button 
            type="submit" 
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
          >
            Hapus
          </button>
        </form>
      )
    }
    return row
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Properti</h1>
        <p className="text-gray-600">Kelola cabang, lantai, dan kamar</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('branches')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'branches'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            🏢 Cabang
          </button>
          <button
            onClick={() => setActiveTab('floors')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'floors'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            🏗️ Lantai
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'rooms'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚪 Kamar
          </button>
        </div>
      </div>

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          {userRole === 'owner' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Cabang
            </button>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table headers={branchHeaders} rows={branchRows} />
          </div>
        </div>
      )}

      {/* Floors Tab */}
      {activeTab === 'floors' && (
        <div className="space-y-4">
          {userRole === 'owner' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Lantai
            </button>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table headers={floorHeaders} rows={floorRows} />
          </div>
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table headers={roomHeaders} rows={roomRows} />
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Add Branch Modal */}
      <Modal isOpen={isModalOpen && activeTab === 'branches'} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Cabang Baru</h2>
        <form action={addBranchAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Cabang</label>
            <input name="name" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Masukkan nama cabang" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat</label>
            <input name="address" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Masukkan alamat cabang" />
          </div>
          {addBranchState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{addBranchState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700">
              Tambah Cabang
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Floor Modal */}
      <Modal isOpen={isModalOpen && activeTab === 'floors'} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Lantai Baru</h2>
        <form action={addFloorAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cabang</label>
            <select name="branch_id" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Pilih Cabang</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lantai</label>
            <input name="name" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Masukkan nama lantai" />
          </div>
          {addFloorState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{addFloorState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700">
              Tambah Lantai
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Room Modal */}
      <Modal isOpen={isModalOpen && activeTab === 'rooms'} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Kamar Baru</h2>
        <form action={createRoomAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lantai</label>
            <select name="floor_id" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Pilih Lantai</option>
              {floorsForRooms.map(floor => (
                <option key={floor.id} value={floor.id}>{floor.name} - {floor.branches?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">No. Kamar</label>
            <input name="room_number" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Contoh: 101" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Harga (Rp)</label>
            <input name="price" type="number" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="1000000" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fasilitas (pisahkan dengan koma)</label>
            <input name="facilities" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="AC, WiFi, Kamar Mandi Dalam" />
          </div>
          {createRoomState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{createRoomState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700">
              Tambah Kamar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

