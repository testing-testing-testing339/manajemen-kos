'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, deleteRoom, updateRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import { 
  Building2, 
  DoorClosed, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  BedDouble, 
  Tv, 
  Wifi, 
  Wind, 
  Flame,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  User,
  Crown,
  Layers
} from 'lucide-react'

type CategoryFilter = 'all' | 'vip' | 'non_vip' | 'available' | 'occupied'
type ViewMode = 'cinema' | 'list'

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
  const [rooms, setRooms] = useState(initialRooms)
  const [floorsForRooms, setFloorsForRooms] = useState(initialFloorsForRooms)
  const [tenants, setTenants] = useState(initialTenants)
  
  const [viewMode, setViewMode] = useState<ViewMode>('cinema')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailRoomModalOpen, setIsDetailRoomModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all')
  const router = useRouter()

  const [createRoomState, createRoomAction] = useActionState(createRoom, null)
  const [updateRoomState, updateRoomAction] = useActionState(updateRoom, null)
  const [deleteRoomState, deleteRoomAction] = useActionState(deleteRoom, null)

  useEffect(() => {
    setRooms(initialRooms)
    setFloorsForRooms(initialFloorsForRooms)
    setTenants(initialTenants)
  }, [initialRooms, initialFloorsForRooms, initialTenants])

  useEffect(() => {
    if (createRoomState?.success || updateRoomState?.success || deleteRoomState?.success) {
      setIsModalOpen(false)
      setIsEditModalOpen(false)
      setIsDetailRoomModalOpen(false)
      setSelectedRoom(null)
      router.refresh()
    }
  }, [createRoomState, updateRoomState, deleteRoomState, router])

  // Tenant lookup map
  const tenantMap = useMemo(() => {
    const map = new Map()
    tenants.forEach(tenant => {
      map.set(tenant.room_id, tenant)
    })
    return map
  }, [tenants])

  // Summary counts
  const stats = useMemo(() => {
    const total = rooms.length
    const vip = rooms.filter(r => r.room_number?.toString().toLowerCase().includes('vip') || r.room_type === 'vip').length
    const nonVip = total - vip
    const occupied = rooms.filter(r => r.is_occupied).length
    const available = total - occupied

    return { total, vip, nonVip, occupied, available }
  }, [rooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    let filtered = [...rooms]

    // Category filter
    if (categoryFilter === 'vip') {
      filtered = filtered.filter(r => r.room_number?.toString().toLowerCase().includes('vip') || r.room_type === 'vip')
    } else if (categoryFilter === 'non_vip') {
      filtered = filtered.filter(r => !r.room_number?.toString().toLowerCase().includes('vip') && r.room_type !== 'vip')
    } else if (categoryFilter === 'available') {
      filtered = filtered.filter(r => !r.is_occupied)
    } else if (categoryFilter === 'occupied') {
      filtered = filtered.filter(r => r.is_occupied)
    }

    // Floor filter
    if (selectedFloorFilter !== 'all') {
      filtered = filtered.filter(r => r.floor_id === selectedFloorFilter)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(r => {
        const roomMatch = r.room_number?.toString().toLowerCase().includes(q)
        const tenant = tenantMap.get(r.id)
        const tenantMatch = tenant?.full_name?.toLowerCase().includes(q)
        return roomMatch || tenantMatch
      })
    }

    // Sort room numbers nicely
    return filtered.sort((a, b) => {
      const numA = parseInt(a.room_number.replace(/\D/g, '')) || 0
      const numB = parseInt(b.room_number.replace(/\D/g, '')) || 0
      return numA - numB
    })
  }, [rooms, categoryFilter, selectedFloorFilter, searchQuery, tenantMap])

  // Group rooms by Floor for Cinema / Matrix View
  const floorsGrouped = useMemo(() => {
    const floorsMap: Record<string, { floorName: string; rooms: any[] }> = {}

    // Sort floors by name
    const sortedFloors = [...floorsForRooms].sort((a, b) => a.name.localeCompare(b.name))
    
    sortedFloors.forEach(f => {
      floorsMap[f.id] = {
        floorName: f.name,
        rooms: []
      }
    })

    // Add rooms to their floor
    filteredRooms.forEach(room => {
      const floorId = room.floor_id || 'unassigned'
      if (!floorsMap[floorId]) {
        floorsMap[floorId] = {
          floorName: room.floors?.name || 'Lantai Lainnya',
          rooms: []
        }
      }
      floorsMap[floorId].rooms.push(room)
    })

    return Object.entries(floorsMap).filter(([_, data]) => data.rooms.length > 0)
  }, [filteredRooms, floorsForRooms])

  const headers = userRole === 'owner' 
    ? ['No. Kamar', 'Tipe & Tarif', 'Lantai', 'Fasilitas', 'Status & Penghuni', 'Aksi'] 
    : ['No. Kamar', 'Tipe & Tarif', 'Lantai', 'Fasilitas', 'Status & Penghuni']

  const rows = filteredRooms.map(room => {
    const isVip = room.room_number?.toString().toLowerCase().includes('vip') || room.room_type === 'vip'
    const tenant = tenantMap.get(room.id)

    const row = [
      <div key={`room-${room.id}`} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
          isVip ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {isVip ? <Crown className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-sm">{room.room_number}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
            isVip ? 'bg-purple-50 text-purple-600 border border-purple-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {isVip ? 'VIP' : 'Standard'}
          </span>
        </div>
      </div>,

      <div key={`price-${room.id}`}>
        <p className="text-xs font-black text-indigo-600">
          Rp 100.000 <span className="text-[10px] font-normal text-slate-500">/malam</span>
        </p>
        <p className="text-[10px] text-slate-400">
          Rp 700k/mgg • Rp 3jt/bln
        </p>
      </div>,

      <span key={`floor-${room.id}`} className="text-xs font-semibold text-slate-700">
        {room.floors?.name || 'Lantai 1'}
      </span>,

      <div key={`fac-${room.id}`} className="flex flex-wrap gap-1 max-w-xs">
        {Array.isArray(room.facilities) && room.facilities.length > 0 ? (
          room.facilities.slice(0, 3).map((f: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
              {f}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-slate-400">AC, Km. Mandi Dalam, Wifi</span>
        )}
        {Array.isArray(room.facilities) && room.facilities.length > 3 && (
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">
            +{room.facilities.length - 3}
          </span>
        )}
      </div>,

      <div key={`status-${room.id}`}>
        {room.is_occupied ? (
          <div className="space-y-0.5">
            <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Terisi
            </span>
            {tenant && (
              <p className="text-xs font-bold text-slate-900 mt-1 truncate max-w-[120px]">
                {tenant.full_name}
              </p>
            )}
          </div>
        ) : (
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Kosong
          </span>
        )}
      </div>
    ]

    if (userRole === 'owner') {
      row.push(
        <div key={`act-${room.id}`} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedRoom(room)
              setIsEditModalOpen(true)
            }}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="Edit Kamar"
          >
            <Edit className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <form action={deleteRoomAction} className="inline">
            <input type="hidden" name="id" value={room.id} />
            <SubmitButton
              variant="danger"
              className="p-1.5 text-xs font-bold rounded-lg cursor-pointer"
              loadingText="..."
            >
              <Trash2 className="w-3.5 h-3.5" />
            </SubmitButton>
          </form>
        </div>
      )
    }

    return row
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daftar & Manajemen 53 Kamar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Graha Aisyah Menteng • 13 Kamar VIP & 40 Kamar Non-VIP (Tarif Seragam Rp 100.000/malam)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200/80">
            <button
              onClick={() => setViewMode('cinema')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cinema'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tampilan Denah</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tabel List</span>
            </button>
          </div>

          {userRole === 'owner' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kamar</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setCategoryFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'all' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Total Kamar</p>
          <p className="text-2xl font-black mt-0.5">{stats.total}</p>
          <p className="text-[10px] opacity-70">Graha Aisyah Menteng</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('vip')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'vip' 
              ? 'bg-purple-700 text-white border-purple-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-200'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Kamar VIP</p>
          <p className="text-2xl font-black mt-0.5 text-purple-700">{stats.vip}</p>
          <p className="text-[10px] text-purple-600 font-semibold">Rp 100k / malam</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('non_vip')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'non_vip' 
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-200'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Kamar Non-VIP</p>
          <p className="text-2xl font-black mt-0.5 text-indigo-700">{stats.nonVip}</p>
          <p className="text-[10px] text-indigo-600 font-semibold">Rp 100k / malam</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('available')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'available' 
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-200'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Kamar Kosong</p>
          <p className="text-2xl font-black mt-0.5 text-emerald-700">{stats.available}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Siap Dihuni</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('occupied')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'occupied' 
              ? 'bg-red-700 text-white border-red-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-red-200'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Kamar Terisi</p>
          <p className="text-2xl font-black mt-0.5 text-red-700">{stats.occupied}</p>
          <p className="text-[10px] text-red-600 font-semibold">Ada Penghuni</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor kamar atau nama penghuni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Legend in Cinema Mode */}
        {viewMode === 'cinema' && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-xs" />
              <span>Kosong</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500 shadow-xs" />
              <span>Terisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200 text-[10px]">VIP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">Non-VIP</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedFloorFilter}
            onChange={(e) => setSelectedFloorFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Lantai (1, 2, 3)</option>
            {floorsForRooms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. CINEMA / ROOM MATRIX VIEW */}
      {viewMode === 'cinema' && (
        <div className="space-y-8">
          {floorsGrouped.map(([floorId, floorData]) => {
            const isFloor1 = floorData.floorName.includes('1')
            return (
              <div key={floorId} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                {/* Floor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {floorData.floorName} {isFloor1 ? '(13 Kamar VIP)' : '(20 Kamar Non-VIP)'}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {floorData.rooms.filter(r => !r.is_occupied).length} Kosong • {floorData.rooms.filter(r => r.is_occupied).length} Terisi • Tarif Rp 100.000 / malam
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 w-fit">
                    Lorong Utama {floorData.floorName}
                  </span>
                </div>

                {/* Grid of Cinema Style Room Seats/Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 pt-2">
                  {floorData.rooms.map(room => {
                    const isVip = room.room_number?.toString().toLowerCase().includes('vip') || room.room_type === 'vip'
                    const tenant = tenantMap.get(room.id)
                    const isOccupied = room.is_occupied

                    return (
                      <div
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room)
                          setIsDetailRoomModalOpen(true)
                        }}
                        className={`group relative rounded-2xl p-3.5 transition-all duration-200 cursor-pointer border flex flex-col justify-between select-none hover:-translate-y-1 hover:shadow-lg ${
                          isOccupied
                            ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                            : isVip
                            ? 'bg-purple-50/70 border-purple-200 hover:border-purple-300'
                            : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {/* Top Tag & Indicator */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            isVip ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isVip ? 'VIP' : 'Non-VIP'}
                          </span>
                          
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            isOccupied ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                          }`} />
                        </div>

                        {/* Room Number Box (Cinema Seat Visual) */}
                        <div className="my-1.5 text-center">
                          <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                            {room.room_number}
                          </p>
                          <p className="text-[10px] font-bold text-indigo-600 mt-0.5">
                            Rp 100k <span className="text-[9px] font-normal text-slate-400">/mlm</span>
                          </p>
                        </div>

                        {/* Status Label or Tenant Name */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-center">
                          {isOccupied ? (
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                                Terisi
                              </p>
                              <p className="text-[11px] font-extrabold text-slate-800 truncate" title={tenant?.full_name}>
                                {tenant?.full_name || 'Penghuni'}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              Kosong
                            </p>
                          )}
                        </div>

                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-indigo-900/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                          <span className="text-[10px] font-bold bg-white text-slate-900 px-2 py-0.5 rounded-lg shadow-md">
                            Lihat Detail
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 2. TABLE LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <Table headers={headers} rows={rows} />
        </div>
      )}

      {/* DETAIL ROOM QUICK MODAL */}
      <Modal isOpen={isDetailRoomModalOpen} onClose={() => setIsDetailRoomModalOpen(false)} size="md">
        {selectedRoom && (() => {
          const isVip = selectedRoom.room_number?.toString().toLowerCase().includes('vip') || selectedRoom.room_type === 'vip'
          const tenant = tenantMap.get(selectedRoom.id)
          const isOccupied = selectedRoom.is_occupied

          return (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isVip ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isVip ? <Crown className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedRoom.room_number}</h2>
                    <p className="text-xs text-slate-400">Graha Aisyah Menteng • {selectedRoom.floors?.name || 'Lantai 1'}</p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isOccupied ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isOccupied ? 'Terisi' : 'Kosong / Siap Huni'}
                </span>
              </div>

              {/* Tenant details if occupied */}
              {isOccupied && tenant && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-1 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Data Penghuni Aktif</p>
                  <p className="font-extrabold text-slate-900 text-sm">{tenant.full_name}</p>
                  <p className="text-slate-600">Kontak: {tenant.phone || '-'}</p>
                  <p className="text-slate-600">Check-in: {tenant.check_in_date || '-'}</p>
                </div>
              )}

              {/* Room details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Kategori</p>
                  <p className="font-bold text-slate-900">{isVip ? 'Kamar VIP' : 'Non-VIP (Standard)'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tarif Harian</p>
                  <p className="font-extrabold text-indigo-600">Rp 100.000 / malam</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tarif Mingguan</p>
                  <p className="font-bold text-slate-800">Rp 700.000 / minggu</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tarif Bulanan</p>
                  <p className="font-bold text-slate-800">Rp 3.000.000 / bulan</p>
                </div>
              </div>

              {/* Facilities */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Fasilitas Kamar:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(selectedRoom.facilities) && selectedRoom.facilities.length > 0 ? (
                    selectedRoom.facilities.map((f: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200/60">
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">AC, Kamar Mandi Dalam, Wifi</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailRoomModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                {userRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailRoomModalOpen(false)
                      setIsEditModalOpen(true)
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Edit Kamar Ini
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Add Room Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <h2 className="text-lg font-extrabold text-slate-900 mb-4">Tambah Kamar Baru</h2>
        <form action={createRoomAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lantai *</label>
            <select
              name="floor_id"
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="">Pilih Lantai</option>
              {floorsForRooms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Kamar *</label>
              <input
                type="text"
                name="room_number"
                required
                placeholder="Contoh: VIP 114 atau 221"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Kamar *</label>
              <select
                name="room_type"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="non_vip">Non-VIP (Standard)</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tarif Per Malam (Rp) *</label>
            <input
              type="number"
              name="price_per_day"
              defaultValue={100000}
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fasilitas (pisahkan dengan koma)</label>
            <input
              type="text"
              name="facilities"
              defaultValue="AC, Kamar Mandi Dalam, Wifi High-Speed, Kasur, Lemari"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {createRoomState?.error && (
            <p className="text-xs text-red-600 font-semibold">{createRoomState.error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
            >
              Batal
            </button>
            <SubmitButton variant="primary" className="flex-1 py-2.5 rounded-xl text-xs font-bold">
              Simpan Kamar
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="md">
        {selectedRoom && (
          <form action={updateRoomAction} className="space-y-4">
            <input type="hidden" name="id" value={selectedRoom.id} />
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Edit Kamar {selectedRoom.room_number}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Kamar *</label>
                <input
                  type="text"
                  name="room_number"
                  defaultValue={selectedRoom.room_number}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Kamar *</label>
                <select
                  name="room_type"
                  defaultValue={selectedRoom.room_type || 'non_vip'}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="non_vip">Non-VIP (Standard)</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarif Per Malam (Rp) *</label>
              <input
                type="number"
                name="price_per_day"
                defaultValue={selectedRoom.price_per_day || 100000}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fasilitas (pisahkan dengan koma)</label>
              <input
                type="text"
                name="facilities"
                defaultValue={Array.isArray(selectedRoom.facilities) ? selectedRoom.facilities.join(', ') : ''}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {updateRoomState?.error && (
              <p className="text-xs text-red-600 font-semibold">{updateRoomState.error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <SubmitButton variant="primary" className="flex-1 py-2.5 rounded-xl text-xs font-bold">
                Update Kamar
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
