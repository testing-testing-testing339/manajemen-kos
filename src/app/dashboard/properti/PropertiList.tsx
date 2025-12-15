'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { addBranch, deleteBranch, addFloor, deleteFloor, createRoom, deleteRoom, updateRoom, bulkCreateRooms } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'

type TabType = 'branches' | 'floors' | 'rooms'

export default function PropertiList({
  initialBranches,
  initialFloors,
  initialRooms,
  initialFloorsForRooms,
  initialTenants,
  userRole
}: {
  initialBranches: any[]
  initialFloors: any[]
  initialRooms: any[]
  initialFloorsForRooms: any[]
  initialTenants: any[]
  userRole: string | null
}) {
  const [activeTab, setActiveTab] = useState<TabType>('branches')
  const [branches, setBranches] = useState(initialBranches)
  const [floors, setFloors] = useState(initialFloors)
  const [rooms, setRooms] = useState(initialRooms)
  const [floorsForRooms, setFloorsForRooms] = useState(initialFloorsForRooms)
  const [tenants, setTenants] = useState(initialTenants)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('')
  const router = useRouter()

  const [addBranchState, addBranchAction] = useActionState(addBranch, null)
  const [deleteBranchState, deleteBranchAction] = useActionState(deleteBranch, null)
  const [addFloorState, addFloorAction] = useActionState(addFloor, null)
  const [deleteFloorState, deleteFloorAction] = useActionState(deleteFloor, null)
  const [createRoomState, createRoomAction] = useActionState(createRoom, null)
  const [updateRoomState, updateRoomAction] = useActionState(updateRoom, null)
  const [bulkCreateRoomsState, bulkCreateRoomsAction] = useActionState(bulkCreateRooms, null)
  const [deleteRoomState, deleteRoomAction] = useActionState(deleteRoom, null)

  useEffect(() => {
    setBranches(initialBranches)
    setFloors(initialFloors)
    setRooms(initialRooms)
    setFloorsForRooms(initialFloorsForRooms)
    setTenants(initialTenants)
  }, [initialBranches, initialFloors, initialRooms, initialFloorsForRooms, initialTenants])

  useEffect(() => {
    if (addBranchState?.success || deleteBranchState?.success || 
        addFloorState?.success || deleteFloorState?.success ||
        createRoomState?.success || updateRoomState?.success || bulkCreateRoomsState?.success || deleteRoomState?.success) {
      setIsModalOpen(false)
      setIsEditModalOpen(false)
      setIsBulkAddModalOpen(false)
      setSelectedRoom(null)
      router.refresh()
    }
  }, [addBranchState, deleteBranchState, addFloorState, deleteFloorState, createRoomState, updateRoomState, bulkCreateRoomsState, deleteRoomState, router])

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
          <SubmitButton
            variant="danger"
            className="px-4 py-2 text-sm font-medium"
            loadingText="Menghapus..."
          >
            Hapus
          </SubmitButton>
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
          <SubmitButton
            variant="danger"
            className="px-4 py-2 text-sm font-medium"
            loadingText="Menghapus..."
          >
            Hapus
          </SubmitButton>
        </form>
      )
    }
    return row
  })

  // Filter and search rooms
  const filteredRooms = useMemo(() => {
    let filtered = [...rooms]

    // Filter by floor
    if (selectedFloorFilter) {
      filtered = filtered.filter(room => room.floor_id === selectedFloorFilter)
    }

    // Search by room number or tenant name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(room => {
        // Search by room number
        const roomNumberMatch = room.room_number?.toLowerCase().includes(query)
        
        // Search by tenant name
        const roomTenant = tenants.find(t => t.room_id === room.id)
        const tenantNameMatch = roomTenant?.full_name?.toLowerCase().includes(query)
        
        return roomNumberMatch || tenantNameMatch
      })
    }

    // Sort by room number
    return filtered.sort((a, b) => {
      const numA = parseInt(a.room_number) || 0
      const numB = parseInt(b.room_number) || 0
      return numA - numB
    })
  }, [rooms, selectedFloorFilter, searchQuery, tenants])

  // Create tenant map for quick lookup
  const tenantMap = useMemo(() => {
    const map = new Map()
    tenants.forEach(tenant => {
      map.set(tenant.room_id, tenant)
    })
    return map
  }, [tenants])

  // Rooms table
  const roomHeaders = userRole === 'owner' ? ['No. Kamar', 'Lantai', 'Harga', 'Fasilitas', 'Penghuni', 'Status', 'Aksi'] : ['No. Kamar', 'Lantai', 'Harga', 'Fasilitas', 'Penghuni', 'Status']
  const roomRows = filteredRooms.map(room => {
    const tenant = tenantMap.get(room.id)
    const row = [
      room.room_number,
      room.floors?.name || 'Unknown',
      <div key={`price-${room.id}`} className="space-y-1">
        {room.price_per_day ? (
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price_per_day)}
            </span>
            <span className="text-xs text-gray-500">/hari</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
        {room.price_per_month && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-indigo-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price_per_month)}
            </span>
            <span className="text-xs text-gray-500">/bulan</span>
          </div>
        )}
        {room.price_per_6months && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-purple-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price_per_6months)}
            </span>
            <span className="text-xs text-gray-500">/6 bulan</span>
          </div>
        )}
      </div>,
      <div key={`facilities-${room.id}`} className="max-w-xs">
        <div className="flex flex-wrap gap-1">
          {room.facilities?.slice(0, 3).map((facility: string, idx: number) => (
            <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
              {facility}
            </span>
          ))}
          {room.facilities && room.facilities.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
              +{room.facilities.length - 3}
            </span>
          )}
        </div>
      </div>,
      <div key={`tenant-${room.id}`}>
        {tenant ? (
          <span className="text-sm font-medium text-gray-900">{tenant.full_name}</span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </div>,
      room.is_occupied ? (
        <span key={`status-${room.id}`} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Terisi
        </span>
      ) : (
        <span key={`status-${room.id}`} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Kosong
        </span>
      )
    ]
    if (userRole === 'owner') {
      row.push(
        <div key={`actions-${room.id}`} className="flex gap-2">
          <button
            onClick={() => {
              setSelectedRoom(room)
              setIsEditModalOpen(true)
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-all duration-150 active:scale-95 active:bg-blue-200"
          >
            Edit
          </button>
          <form action={deleteRoomAction} className="inline">
            <input type="hidden" name="id" value={room.id} />
            <SubmitButton
              variant="danger"
              className="px-4 py-2 text-sm font-medium"
              loadingText="Menghapus..."
            >
              Hapus
            </SubmitButton>
          </form>
        </div>
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
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-initial sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari no. kamar atau nama penghuni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
              </div>
              
              {/* Floor Filter */}
              <div className="relative sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <select
                  value={selectedFloorFilter}
                  onChange={(e) => setSelectedFloorFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Semua Lantai</option>
                  {floorsForRooms.map(floor => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name} - {floor.branches?.name || ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Button */}
            {userRole === 'owner' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Kamar
              </button>
            )}
          </div>

          {/* Results Count */}
          {(selectedFloorFilter || searchQuery) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-indigo-900">
                Menampilkan {filteredRooms.length} dari {rooms.length} kamar
              </span>
              {(selectedFloorFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedFloorFilter('')
                    setSearchQuery('')
                  }}
                  className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset Filter
                </button>
              )}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredRooms.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Tidak ada kamar ditemukan</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery || selectedFloorFilter 
                    ? 'Coba ubah filter atau kata kunci pencarian'
                    : 'Belum ada kamar yang tersedia'
                  }
                </p>
              </div>
            ) : (
              <Table headers={roomHeaders} rows={roomRows} />
            )}
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
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95">
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Menambahkan..."
            >
              Tambah Cabang
            </SubmitButton>
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
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Menambahkan..."
            >
              Tambah Lantai
            </SubmitButton>
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per Hari (Rp)
                  <span className="text-xs font-normal text-red-500 ml-2">Wajib</span>
                </label>
                <input 
                  name="price_per_day" 
                  type="number" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="50000" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per Bulan (Rp)
                  <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
                </label>
                <input 
                  name="price_per_month" 
                  type="number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="1000000" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per 6 Bulan (Rp)
                  <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
                </label>
                <input 
                  name="price_per_6months" 
                  type="number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="5500000" 
                />
                <p className="text-xs text-gray-500 mt-1">Harga untuk sewa 6 bulan (biasanya lebih murah)</p>
              </div>
            </div>
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

      {/* Edit Room Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => {
        setIsEditModalOpen(false)
        setSelectedRoom(null)
      }}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Kamar</h2>
        {selectedRoom && (
          <form action={updateRoomAction} className="space-y-5">
            <input type="hidden" name="id" value={selectedRoom.id} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lantai</label>
              <select name="floor_id" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" defaultValue={selectedRoom.floor_id}>
                <option value="">Pilih Lantai</option>
                {floorsForRooms.map(floor => (
                  <option key={floor.id} value={floor.id}>{floor.name} - {floor.branches?.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">No. Kamar</label>
              <input name="room_number" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" defaultValue={selectedRoom.room_number} placeholder="Contoh: 101" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per Hari (Rp)
                  <span className="text-xs font-normal text-red-500 ml-2">Wajib</span>
                </label>
                <input 
                  name="price_per_day" 
                  type="number" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="50000"
                  defaultValue={selectedRoom.price_per_day || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per Bulan (Rp)
                  <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
                </label>
                <input 
                  name="price_per_month" 
                  type="number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="1000000"
                  defaultValue={selectedRoom.price_per_month || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Harga Per 6 Bulan (Rp)
                  <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
                </label>
                <input 
                  name="price_per_6months" 
                  type="number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="5500000"
                  defaultValue={selectedRoom.price_per_6months || ''}
                />
                <p className="text-xs text-gray-500 mt-1">Harga untuk sewa 6 bulan (biasanya lebih murah)</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fasilitas (pisahkan dengan koma)</label>
              <input name="facilities" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="AC, WiFi, Kamar Mandi Dalam" defaultValue={selectedRoom.facilities?.join(', ') || ''} />
            </div>
            {updateRoomState?.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{updateRoomState.error}</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => {
                setIsEditModalOpen(false)
                setSelectedRoom(null)
              }} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95">
                Batal
              </button>
              <SubmitButton
                variant="primary"
                className="flex-1 px-4 py-3"
                loadingText="Menyimpan..."
              >
                Simpan Perubahan
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Add Rooms Modal */}
      <Modal isOpen={isBulkAddModalOpen} onClose={() => {
        setIsBulkAddModalOpen(false)
      }}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Banyak Kamar</h2>
        <form action={bulkCreateRoomsAction} className="space-y-5">
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Kamar Awal</label>
            <input name="start_room_number" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Contoh: 101" />
            <p className="text-xs text-gray-500 mt-1">Kamar akan dinomori otomatis mulai dari nomor ini (101, 102, 103, dst)</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Kamar</label>
            <input name="room_count" type="number" required min="1" max="100" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="10" />
            <p className="text-xs text-gray-500 mt-1">Masukkan jumlah kamar yang ingin ditambahkan (maksimal 100)</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Per Hari (Rp)
                <span className="text-xs font-normal text-red-500 ml-2">Wajib</span>
              </label>
              <input 
                name="price_per_day" 
                type="number" 
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="50000" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Per Bulan (Rp)
                <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
              </label>
              <input 
                name="price_per_month" 
                type="number" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="1000000" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Per 6 Bulan (Rp)
                <span className="text-xs font-normal text-gray-500 ml-2">Opsional</span>
              </label>
              <input 
                name="price_per_6months" 
                type="number" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                placeholder="5500000" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fasilitas (pisahkan dengan koma)</label>
            <input name="facilities" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="AC, WiFi, Kamar Mandi Dalam" />
            <p className="text-xs text-gray-500 mt-1">Fasilitas yang sama akan diterapkan ke semua kamar</p>
          </div>
          {bulkCreateRoomsState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{bulkCreateRoomsState.error}</p>
            </div>
          )}
          {bulkCreateRoomsState?.success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">Berhasil menambahkan {bulkCreateRoomsState.count || 0} kamar!</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsBulkAddModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95">
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

