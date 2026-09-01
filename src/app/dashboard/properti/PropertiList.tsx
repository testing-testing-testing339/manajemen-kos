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
  Layers,
  Zap,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Info
} from 'lucide-react'

type CategoryFilter = 'all' | 'vip' | 'dasar' | 'lt2' | 'lt3' | 'available' | 'occupied' | 'issues'
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
  const [copiedPln, setCopiedPln] = useState(false)
  const router = useRouter()

  const copyToClipboard = (text: string) => {
    if (!text) return
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
    setCopiedPln(true)
    setTimeout(() => setCopiedPln(false), 2000)
  }

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

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

  // Helper to extract room condition (e.g. AC Mati, TV Mati)
  const getRoomCondition = (facilities: string[] = [], damageNotes?: string | null): string | null => {
    if (damageNotes && damageNotes.trim()) return damageNotes.trim()
    if (!Array.isArray(facilities)) return null
    const match = facilities.find(f => 
      f.toLowerCase().startsWith('kondisi:') || 
      f.toLowerCase().includes('ac mati') || 
      f.toLowerCase().includes('tv mati') || 
      f.toLowerCase().includes('tv gk idup')
    )
    if (!match) return null
    if (match.toLowerCase().includes('ac mati')) return 'AC Mati'
    if (match.toLowerCase().includes('tv mati') || match.toLowerCase().includes('tv gk idup')) return 'TV Mati / Gak Idup'
    return match.replace(/^kondisi:\s*/i, '')
  }

  // Helper to determine facility tier
  const getFacilityTier = (facilities: string[] = []): { label: string; color: string } => {
    if (!Array.isArray(facilities)) return { label: 'Standard', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    const isNonFasilitas = facilities.some(f => f.toLowerCase().includes('non fasilitas'))
    const hasTv = facilities.some(f => f.toLowerCase().includes('tv'))
    const hasAc = facilities.some(f => f.toLowerCase() === 'ac')

    if (isNonFasilitas) {
      return { label: 'Non Fasilitas', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
    }
    if (hasAc && hasTv) {
      return { label: 'Full Fasilitas', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    }
    if (hasAc && !hasTv) {
      return { label: 'AC Saja', color: 'bg-sky-50 text-sky-700 border-sky-200' }
    }
    return { label: 'Non AC', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  // Summary counts
  const stats = useMemo(() => {
    const total = rooms.length
    const vip = rooms.filter(r => r.floors?.name?.toLowerCase().includes('vip') || r.room_type === 'vip').length
    const dasar = rooms.filter(r => r.floors?.name?.toLowerCase() === 'dasar' || r.floors?.name?.toLowerCase().includes('dasar')).length
    const lt2 = rooms.filter(r => r.floors?.name?.toLowerCase().includes('lt 2') || r.floors?.name?.toLowerCase().includes('lantai 2')).length
    const lt3 = rooms.filter(r => r.floors?.name?.toLowerCase().includes('lt 3') || r.floors?.name?.toLowerCase().includes('lantai 3')).length
    const occupied = rooms.filter(r => r.is_occupied).length
    const available = total - occupied
    const issues = rooms.filter(r => Boolean(getRoomCondition(r.facilities, r.damage_notes))).length

    return { total, vip, dasar, lt2, lt3, occupied, available, issues }
  }, [rooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    let filtered = [...rooms]

    // Category filter
    if (categoryFilter === 'vip') {
      filtered = filtered.filter(r => r.floors?.name?.toLowerCase().includes('vip') || r.room_type === 'vip')
    } else if (categoryFilter === 'dasar') {
      filtered = filtered.filter(r => r.floors?.name?.toLowerCase() === 'dasar' || r.floors?.name?.toLowerCase().includes('dasar'))
    } else if (categoryFilter === 'lt2') {
      filtered = filtered.filter(r => r.floors?.name?.toLowerCase().includes('lt 2') || r.floors?.name?.toLowerCase().includes('lantai 2'))
    } else if (categoryFilter === 'lt3') {
      filtered = filtered.filter(r => r.floors?.name?.toLowerCase().includes('lt 3') || r.floors?.name?.toLowerCase().includes('lantai 3'))
    } else if (categoryFilter === 'available') {
      filtered = filtered.filter(r => !r.is_occupied)
    } else if (categoryFilter === 'occupied') {
      filtered = filtered.filter(r => r.is_occupied)
    } else if (categoryFilter === 'issues') {
      filtered = filtered.filter(r => Boolean(getRoomCondition(r.facilities, r.damage_notes)))
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
        const floorMatch = r.floors?.name?.toLowerCase().includes(q)
        const tenant = tenantMap.get(r.id)
        const tenantMatch = tenant?.full_name?.toLowerCase().includes(q)
        const facMatch = Array.isArray(r.facilities) && r.facilities.some((f: string) => f.toLowerCase().includes(q))
        return roomMatch || floorMatch || tenantMatch || facMatch
      })
    }

    // Sort room numbers numerically
    return filtered.sort((a, b) => {
      const numA = parseInt(a.room_number.replace(/\D/g, '')) || 0
      const numB = parseInt(b.room_number.replace(/\D/g, '')) || 0
      return numA - numB
    })
  }, [rooms, categoryFilter, selectedFloorFilter, searchQuery, tenantMap])

  // Group rooms by Section/Floor with customized section ordering
  const floorsGrouped = useMemo(() => {
    const orderMap: Record<string, number> = {
      'vip belakang warkop': 1,
      'dasar': 2,
      'gedung atas lt 2': 3,
      'gedung atas lt 3': 4
    }

    const floorsMap: Record<string, { floorName: string; rooms: any[] }> = {}

    // Sort floors according to the logical order
    const sortedFloors = [...floorsForRooms].sort((a, b) => {
      const rankA = orderMap[a.name.toLowerCase().trim()] || 99
      const rankB = orderMap[b.name.toLowerCase().trim()] || 99
      return rankA - rankB
    })
    
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
          floorName: room.floors?.name || 'Section Lainnya',
          rooms: []
        }
      }
      floorsMap[floorId].rooms.push(room)
    })

    return Object.entries(floorsMap).filter(([_, data]) => data.rooms.length > 0)
  }, [filteredRooms, floorsForRooms])

  const headers = userRole === 'owner' 
    ? ['No. Kamar', 'Section / Bagian', 'Tipe & Fasilitas', 'Tarif', 'Status & Penghuni', 'Aksi'] 
    : ['No. Kamar', 'Section / Bagian', 'Tipe & Fasilitas', 'Tarif', 'Status & Penghuni']

  const rows = filteredRooms.map(room => {
    const isVip = room.floors?.name?.toLowerCase().includes('vip') || room.room_type === 'vip'
    const tenant = tenantMap.get(room.id)
    const condition = getRoomCondition(room.facilities, room.damage_notes)
    const tier = getFacilityTier(room.facilities)

    const row = [
      <div key={`room-${room.id}`} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
          isVip ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {isVip ? <Crown className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-sm">Kamar {room.room_number}</p>
          {condition && (
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              {condition}
            </span>
          )}
        </div>
      </div>,

      <div key={`floor-${room.id}`}>
        <span className="text-xs font-bold text-slate-800">
          {room.floors?.name || 'Dasar'}
        </span>
      </div>,

      <div key={`fac-${room.id}`} className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${tier.color}`}>
            {tier.label}
          </span>
          {isVip && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              VIP
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 max-w-xs">
          {Array.isArray(room.facilities) && room.facilities.length > 0 ? (
            room.facilities
              .filter((f: string) => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('kondisi:'))
              .slice(0, 3)
              .map((f: string, i: number) => (
                <span key={i} className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {f}
                </span>
              ))
          ) : (
            <span className="text-[10px] text-slate-400">AC, Single Bed, Km. Mandi</span>
          )}
        </div>
      </div>,

      <div key={`price-${room.id}`}>
        <p className="text-xs font-black text-indigo-600">
          Rp 100.000 <span className="text-[10px] font-normal text-slate-500">/malam</span>
        </p>
        <p className="text-[10px] text-slate-400">
          Rp 500k/mgg • Rp 1,35jt/bln
        </p>
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
            Daftar & Denah Kamar Kos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Graha Aisyah Menteng • 4 Section (VIP Belakang Warkop, Dasar, Gedung Atas Lt 2 & 3) • Total 52 Kamar
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

      {/* Stats Summary Cards per Section */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div 
          onClick={() => setCategoryFilter('all')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'all' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Semua</p>
          <p className="text-2xl font-black mt-0.5">{stats.total}</p>
          <p className="text-[10px] opacity-70">52 Kamar Aktif</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('vip')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'vip' 
              ? 'bg-purple-700 text-white border-purple-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-200'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">VIP Blkg Warkop</p>
          <p className="text-2xl font-black mt-0.5 text-purple-700">{stats.vip}</p>
          <p className="text-[10px] text-purple-600 font-semibold">Kamar 1–13</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('dasar')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'dasar' 
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-200'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Dasar</p>
          <p className="text-2xl font-black mt-0.5 text-indigo-700">{stats.dasar}</p>
          <p className="text-[10px] text-indigo-600 font-semibold">Kamar 1–18</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('lt2')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'lt2' 
              ? 'bg-blue-700 text-white border-blue-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-200'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Gedung Atas Lt 2</p>
          <p className="text-2xl font-black mt-0.5 text-blue-700">{stats.lt2}</p>
          <p className="text-[10px] text-blue-600 font-semibold">17 Kamar</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('lt3')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'lt3' 
              ? 'bg-teal-700 text-white border-teal-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-200'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Gedung Atas Lt 3</p>
          <p className="text-2xl font-black mt-0.5 text-teal-700">{stats.lt3}</p>
          <p className="text-[10px] text-teal-600 font-semibold">Kamar 9–12</p>
        </div>

        <div 
          onClick={() => setCategoryFilter('issues')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'issues' 
              ? 'bg-rose-700 text-white border-rose-700 shadow-md' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-200'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Unit Kendala</p>
          <p className="text-2xl font-black mt-0.5 text-rose-700">{stats.issues}</p>
          <p className="text-[10px] text-rose-600 font-semibold">AC/TV Perlu Servis</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kamar, section, fasilitas, atau penghuni..."
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
              <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[10px]">Kendala</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedFloorFilter}
            onChange={(e) => setSelectedFloorFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Section (4 Bagian)</option>
            {floorsForRooms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. CINEMA / ROOM MATRIX VIEW (PER SECTION) */}
      {viewMode === 'cinema' && (
        <div className="space-y-8">
          {floorsGrouped.map(([floorId, floorData]) => {
            const isVipSection = floorData.floorName.toLowerCase().includes('vip')
            const totalInFloor = floorData.rooms.length
            const emptyInFloor = floorData.rooms.filter(r => !r.is_occupied).length
            const occupiedInFloor = totalInFloor - emptyInFloor

            return (
              <div key={floorId} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                {/* Floor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                      isVipSection ? 'bg-purple-100 text-purple-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {isVipSection ? <Crown className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        {floorData.floorName} ({totalInFloor} Kamar)
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {emptyInFloor} Kosong • {occupiedInFloor} Terisi • Tarif Rp 100.000 / malam
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60 w-fit">
                    Section {floorData.floorName}
                  </span>
                </div>

                {/* Grid of Cinema Style Room Seats/Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 pt-2">
                  {floorData.rooms.map(room => {
                    const isVip = room.floors?.name?.toLowerCase().includes('vip') || room.room_type === 'vip'
                    const tenant = tenantMap.get(room.id)
                    const isOccupied = room.is_occupied
                    const condition = getRoomCondition(room.facilities, room.damage_notes)
                    const tier = getFacilityTier(room.facilities)

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
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border truncate ${tier.color}`}>
                            {tier.label}
                          </span>
                          
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isOccupied ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                          }`} />
                        </div>

                        {/* Room Number Box (Cinema Seat Visual) */}
                        <div className="my-1.5 text-center">
                          <p className="text-lg font-black text-slate-900 leading-tight">
                            Kamar {room.room_number}
                          </p>
                          <p className="text-[10px] font-bold text-indigo-600 mt-0.5">
                            Rp 100k <span className="text-[9px] font-normal text-slate-400">/mlm</span>
                          </p>

                          {/* Condition Alert Pill if any */}
                          {condition && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              {condition}
                            </span>
                          )}
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
          const isVip = selectedRoom.floors?.name?.toLowerCase().includes('vip') || selectedRoom.room_type === 'vip'
          const tenant = tenantMap.get(selectedRoom.id)
          const isOccupied = selectedRoom.is_occupied
          const condition = getRoomCondition(selectedRoom.facilities, selectedRoom.damage_notes)
          const tier = getFacilityTier(selectedRoom.facilities)

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
                    <h2 className="text-lg font-black text-slate-900">Kamar {selectedRoom.room_number}</h2>
                    <p className="text-xs text-slate-500 font-semibold">{selectedRoom.floors?.name || 'Dasar'} • Graha Aisyah Menteng</p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isOccupied ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isOccupied ? 'Terisi' : 'Kosong / Siap Huni'}
                </span>
              </div>

              {/* Special Condition Warning Banner */}
              {condition && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold uppercase tracking-wider text-[10px] text-amber-800">Catatan Kondisi Unit:</p>
                    <p className="font-bold text-amber-950 mt-0.5">{condition}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Harap pastikan unit ini diservis atau informasikan kepada calon tamu sebelum ditempati.</p>
                  </div>
                </div>
              )}

              {/* Tenant details if occupied */}
              {isOccupied && tenant && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Data Penghuni Aktif</p>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">Aktif Huni</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm">{tenant.full_name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                    <p><strong className="text-slate-800">Paket Sewa:</strong> {tenant.rental_duration === 'transit_morning' ? 'Sesi Pagi (s/d 12:00 WIB)' : tenant.rental_duration === 'weekly' ? `${tenant.rental_count || 1} Minggu` : tenant.rental_duration === 'monthly' ? `${tenant.rental_count || 1} Bulan` : `${tenant.rental_count || 1} Hari`}</p>
                    <p><strong className="text-slate-800">Kontak:</strong> {tenant.phone || '-'}</p>
                    <p><strong className="text-slate-800">Check-in:</strong> {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                    <p><strong className="text-slate-800">Checkout / Tempo:</strong> {tenant.payment_due_date ? new Date(tenant.payment_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} {tenant.rental_duration === 'transit_morning' ? '(12:00 Siang)' : ''}</p>
                    <p><strong className="text-slate-800">Jaminan:</strong> {Number(tenant.deposit_amount || 0) > 0 ? `Deposit Rp ${Number(tenant.deposit_amount).toLocaleString('id-ID')}` : 'Titip KTP Fisik'}</p>
                  </div>
                </div>
              )}

              {/* Room details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Bagian / Section</p>
                  <p className="font-bold text-slate-900">{selectedRoom.floors?.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tipe Fasilitas</p>
                  <p className="font-extrabold text-indigo-700">{tier.label}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tarif Harian</p>
                  <p className="font-extrabold text-indigo-600">Rp 100.000 / malam</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Tarif Mingguan / Bulanan</p>
                  <p className="font-bold text-slate-800">Rp 500k/mgg • Rp 1,35jt/bln</p>
                </div>
              </div>

              {/* PLN Meter ID Section */}
              {(() => {
                const plnId = Array.isArray(selectedRoom.facilities)
                  ? selectedRoom.facilities.find((f: string) => f.toLowerCase().startsWith('id pln:') || f.toLowerCase().startsWith('pln:'))?.replace(/^(id pln:|pln:)\s*/i, '')
                  : null

                if (!plnId) return null

                return (
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                        <Zap className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">No. ID Meteran PLN</p>
                        <p className="font-mono text-sm font-black text-slate-900">{plnId}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plnId)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer flex items-center gap-1 shadow-xs transition-all ${
                        copiedPln
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white hover:bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                      title="Copy ID PLN"
                    >
                      {copiedPln ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-amber-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })()}

              {/* Facilities List */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Fasilitas Kamar:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(selectedRoom.facilities) && selectedRoom.facilities.length > 0 ? (
                    selectedRoom.facilities
                      .filter((f: string) => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('pln:'))
                      .map((f: string, i: number) => {
                        const isCond = f.toLowerCase().startsWith('kondisi:')
                        return (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            isCond 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
                              : 'bg-slate-100 text-slate-700 border-slate-200/60'
                          }`}>
                            {f}
                          </span>
                        )
                      })
                  ) : (
                    <span className="text-xs text-slate-400">Kasur, Kamar Mandi</span>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Section / Lantai *</label>
            <select
              name="floor_id"
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="">Pilih Section Lantai</option>
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
                placeholder="Contoh: 1, 2, 18, 21"
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
              defaultValue="AC, Kamar Mandi Dalam, Single Bed, Lemari Pakaian, Meja"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kerusakan / Kendala (Opsional - Hanya untuk Owner/Staf)</label>
            <input
              type="text"
              name="damage_notes"
              placeholder="Contoh: AC Bocor, TV Tidak Menyala (kosongkan jika normal)"
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
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Edit Kamar {selectedRoom.room_number} ({selectedRoom.floors?.name})</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Section / Lantai *</label>
              <select
                name="floor_id"
                defaultValue={selectedRoom.floor_id}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
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

            {(() => {
              const plnId = Array.isArray(selectedRoom.facilities)
                ? selectedRoom.facilities.find((f: string) => f.toLowerCase().startsWith('id pln:') || f.toLowerCase().startsWith('pln:'))?.replace(/^(id pln:|pln:)\s*/i, '') || ''
                : ''
              const regularFacilities = Array.isArray(selectedRoom.facilities)
                ? selectedRoom.facilities.filter((f: string) => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('pln:') && !f.toLowerCase().startsWith('kondisi:')).join(', ')
                : ''
              const oldKondisi = Array.isArray(selectedRoom.facilities)
                ? selectedRoom.facilities.find((f: string) => f.toLowerCase().startsWith('kondisi:'))?.replace(/^kondisi:\s*/i, '') || ''
                : ''
              const damageNotesDefault = selectedRoom.damage_notes || oldKondisi

              return (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fasilitas (pisahkan dengan koma)</label>
                    <input
                      type="text"
                      name="facilities"
                      defaultValue={regularFacilities}
                      placeholder="AC, Kamar Mandi Dalam, Single Bed, Lemari Pakaian, Meja"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kerusakan / Kendala (Opsional - Hanya untuk Owner/Staf)</label>
                    <input
                      type="text"
                      name="damage_notes"
                      defaultValue={damageNotesDefault}
                      placeholder="Contoh: AC Bocor, TV Tidak Menyala (kosongkan jika normal)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  {userRole === 'owner' && (
                    <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                      <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                        No. ID Pelanggan PLN / No. Meter (Khusus Owner):
                      </label>
                      <input
                        type="text"
                        name="pln_id"
                        defaultValue={plnId}
                        placeholder="Contoh: 512345678901"
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-amber-700 mt-1">
                        * Nomor meteran listrik untuk pembelian token atau pemantauan tagihan.
                      </p>
                    </div>
                  )}
                </>
              )
            })()}

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
