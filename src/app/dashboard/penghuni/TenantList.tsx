'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createTenant, deleteTenant } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Building2, 
  Layers, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  RotateCcw,
  LogOut,
  ExternalLink,
  Zap,
  Phone,
  DoorClosed
} from 'lucide-react'

interface TenantListProps {
  initialTenants: any[]
  initialAvailableRooms: any[]
  branches: any[]
  floors: any[]
  userRole: string
}

export default function TenantList({ 
  initialTenants, 
  initialAvailableRooms, 
  branches = [], 
  floors = [], 
  userRole 
}: TenantListProps) {
  const router = useRouter()
  const [tenants, setTenants] = useState(initialTenants)
  const [availableRooms, setAvailableRooms] = useState(initialAvailableRooms)
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [checkoutTenant, setCheckoutTenant] = useState<any>(null)
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedFloor, setSelectedFloor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const [createState, createAction] = useActionState(createTenant, null)
  const [deleteState, deleteAction] = useActionState(deleteTenant, null)

  useEffect(() => {
    setTenants(initialTenants)
    setAvailableRooms(initialAvailableRooms)
  }, [initialTenants, initialAvailableRooms])

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [createState, router])

  useEffect(() => {
    if (deleteState?.success) {
      setCheckoutTenant(null)
      router.refresh()
    }
  }, [deleteState, router])

  // Filter floors based on selected branch
  const availableFloors = useMemo(() => {
    if (selectedBranch === 'all') return floors
    return floors.filter(f => f.branch_id === selectedBranch)
  }, [floors, selectedBranch])

  // Helper to determine due date status
  const getDueStatus = (dueDateStr: string) => {
    if (!dueDateStr) return 'active'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDateStr)
    due.setHours(0, 0, 0, 0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'overdue'
    if (diffDays <= 7) return 'near'
    return 'active'
  }

  // Filtered tenants calculation
  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      // Search filter (name, room number, phone)
      const q = searchQuery.toLowerCase()
      const nameMatch = tenant.full_name?.toLowerCase().includes(q)
      const roomMatch = tenant.rooms?.room_number?.toString().toLowerCase().includes(q)
      const phoneMatch = tenant.phone_number?.toLowerCase().includes(q)
      if (searchQuery && !nameMatch && !roomMatch && !phoneMatch) return false

      // Branch filter
      const tenantBranchId = tenant.rooms?.floors?.branches?.id || tenant.rooms?.floors?.branch_id
      if (selectedBranch !== 'all' && tenantBranchId !== selectedBranch) return false

      // Floor filter
      const tenantFloorId = tenant.rooms?.floor_id || tenant.rooms?.floors?.id
      if (selectedFloor !== 'all' && tenantFloorId !== selectedFloor) return false

      // Due date status filter
      if (selectedStatus !== 'all') {
        const status = getDueStatus(tenant.payment_due_date)
        if (status !== selectedStatus) return false
      }

      return true
    })
  }, [tenants, searchQuery, selectedBranch, selectedFloor, selectedStatus])

  // Statistics calculation
  const stats = useMemo(() => {
    let active = 0
    let near = 0
    let overdue = 0

    tenants.forEach(t => {
      const st = getDueStatus(t.payment_due_date)
      if (st === 'overdue') overdue++
      else if (st === 'near') near++
      else active++
    })

    return { total: tenants.length, active, near, overdue }
  }, [tenants])

  const hasActiveFilters = searchQuery !== '' || selectedBranch !== 'all' || selectedFloor !== 'all' || selectedStatus !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedBranch('all')
    setSelectedFloor('all')
    setSelectedStatus('all')
  }

  const headers = ['Penghuni', 'Kamar & Lokasi', 'Tgl Masuk', 'Jatuh Tempo', 'Meteran Listrik', 'Aksi']
  
  const rows = filteredTenants.map(tenant => {
    const branchName = tenant.rooms?.floors?.branches?.name || 'Cabang'
    const floorName = tenant.rooms?.floors?.name || 'Lantai'
    const roomNumber = tenant.rooms?.room_number || '-'
    const dueStatus = getDueStatus(tenant.payment_due_date)
    const dueDate = tenant.payment_due_date ? new Date(tenant.payment_due_date) : null

    return [
      <div key={`name-${tenant.id}`} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
          {tenant.full_name?.substring(0, 2).toUpperCase() || 'P'}
        </div>
        <div>
          <p className="font-bold text-slate-900 leading-tight">{tenant.full_name}</p>
          {tenant.id_card_url && (
            <a 
              href={tenant.id_card_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 mt-0.5"
            >
              KTP/Identitas <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>,

      <div key={`room-${tenant.id}`}>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
          <DoorClosed className="w-3.5 h-3.5 text-indigo-600" />
          Kamar {roomNumber}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          {branchName} • {floorName}
        </p>
      </div>,

      <span key={`checkin-${tenant.id}`} className="text-xs text-slate-600 font-medium">
        {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
      </span>,

      <div key={`due-${tenant.id}`}>
        {dueDate ? (
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              dueStatus === 'overdue'
                ? 'bg-red-100 text-red-700'
                : dueStatus === 'near'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {dueStatus === 'overdue' && <AlertTriangle className="w-3 h-3 text-red-600" />}
              {dueStatus === 'near' && <Clock className="w-3 h-3 text-amber-600" />}
              {dueStatus === 'active' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5 pl-1">
              {dueStatus === 'overdue' ? 'Menunggak' : dueStatus === 'near' ? 'Jatuh tempo segera' : 'Lancar'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>,

      <div key={`meter-${tenant.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span>{tenant.electricity_meter_start || 0} kWh</span>
      </div>,

      <button
        key={`action-${tenant.id}`}
        type="button"
        onClick={() => setCheckoutTenant(tenant)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200/80 hover:border-red-600 transition-all duration-150 cursor-pointer shadow-xs"
      >
        <LogOut className="w-3.5 h-3.5" />
        Check-out
      </button>
    ]
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Data Penghuni
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {filteredTenants.length} dari {tenants.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data penyewa kos, status sewa, dan pengingat jatuh tempo
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Check-in Penghuni Baru
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Penghuni</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status Lancar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.active}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jatuh Tempo &lt; 7 Hari</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.near}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Menunggak</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Advanced Filter Panel & Custom Dropdowns */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter & Pencarian Penghuni</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / no. kamar..."
              className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Branch Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value)
                setSelectedFloor('all')
              }}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">🏢 Semua Cabang Kos</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Floor Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">🪜 Semua Lantai</option>
              {availableFloors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Due Status Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full appearance-none pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">⚡ Semua Status Jatuh Tempo</option>
              <option value="active">🟢 Pembayaran Lancar</option>
              <option value="near">🟡 Segera Jatuh Tempo (&le; 7 Hari)</option>
              <option value="overdue">🔴 Menunggak (Lewat Jatuh Tempo)</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Data */}
      {filteredTenants.length > 0 ? (
        <Table headers={headers} rows={rows} />
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada penghuni yang sesuai</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter di atas untuk melihat seluruh data penghuni kos.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      )}

      {/* Modal Check-In Baru */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Check-in Penghuni Baru
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Daftarkan penghuni ke kamar yang tersedia dan atur tanggal tagihan
          </p>
        </div>

        <form action={createAction} className="space-y-4">
          {/* Kamar Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Pilih Kamar Tersedia
            </label>
            <div className="relative">
              <select 
                name="room_id" 
                required 
                className="w-full appearance-none pl-3.5 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              >
                <option value="">-- Pilih Kamar Kos --</option>
                {availableRooms.map(room => {
                  const branch = room.floors?.branches?.name || 'Cabang'
                  const floor = room.floors?.name || 'Lantai'
                  const priceStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price || 0)
                  return (
                    <option key={room.id} value={room.id}>
                      Kamar {room.room_number} - {branch} ({floor}) • {priceStr}/bulan
                    </option>
                  )
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Lengkap Penghuni
              </label>
              <input 
                name="full_name" 
                type="text" 
                required 
                placeholder="cth: Ahmad Fauzi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Link Foto KTP / Dokumen
              </label>
              <input 
                name="id_card_url" 
                type="text" 
                required 
                placeholder="https://... atau nomor NIK"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tanggal Masuk
              </label>
              <input 
                name="check_in_date" 
                type="date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Jatuh Tempo Pembayaran
              </label>
              <input 
                name="payment_due_date" 
                type="date" 
                required 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Angka Meteran Listrik Awal (kWh)
            </label>
            <input 
              name="electricity_meter_start" 
              type="number" 
              step="any"
              required 
              defaultValue="0"
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all" 
            />
          </div>

          {createState?.error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {createState.error}
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              loadingText="Menyimpan..."
            >
              Simpan & Check-in
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Check-Out */}
      <Modal isOpen={!!checkoutTenant} onClose={() => setCheckoutTenant(null)} size="sm">
        {checkoutTenant && (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Check-out</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin memproses check-out untuk penghuni <strong className="text-slate-800">{checkoutTenant.full_name}</strong> dari <strong className="text-slate-800">Kamar {checkoutTenant.rooms?.room_number}</strong>?
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 mt-3 text-left">
              ⚠️ Status kamar akan otomatis berubah menjadi kosong / siap dihuni kembali.
            </p>

            <form action={deleteAction} className="mt-5 flex items-center justify-center gap-3">
              <input type="hidden" name="id" value={checkoutTenant.id} />
              <button
                type="button"
                onClick={() => setCheckoutTenant(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="danger"
                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                loadingText="Memproses..."
              >
                Ya, Check-out
              </SubmitButton>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}