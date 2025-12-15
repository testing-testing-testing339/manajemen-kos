'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createTenant, deleteTenant } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'

export default function TenantList({ 
  initialTenants, 
  initialAvailableRooms,
  userRole,
  branches,
  floors
}: { 
  initialTenants: any[]
  initialAvailableRooms: any[]
  userRole: string | null
  branches: any[]
  floors: any[]
}) {
  const [tenants, setTenants] = useState(initialTenants)
  const [availableRooms, setAvailableRooms] = useState(initialAvailableRooms)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedFloor, setSelectedFloor] = useState<string>('')
  const router = useRouter()
  const [createState, createAction] = useActionState(createTenant, null)
  const [deleteState, deleteAction] = useActionState(deleteTenant, null)

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      fetchTenants()
      fetchAvailableRooms()
    }
  }, [createState])

  useEffect(() => {
    if (deleteState?.success) {
      setDeletingId(null)
      router.refresh()
      fetchTenants()
      fetchAvailableRooms()
    }
    if (deleteState?.error) {
      setDeletingId(null)
      alert(`Error: ${deleteState.error}`)
    }
  }, [deleteState, router])

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*, rooms(room_number, floors(branches(name)))')
    setTenants(data || [])
  }

  const fetchAvailableRooms = async () => {
    const { data } = await supabase.from('rooms').select('*, floors(branches(name))').eq('is_occupied', false)
    setAvailableRooms(data || [])
  }

  // Filter floors based on selected branch
  const filteredFloors = useMemo(() => {
    if (!selectedBranch) return floors
    return floors.filter(floor => floor.branch_id === selectedBranch)
  }, [selectedBranch, floors])

  // Filter tenants based on search, branch, and floor
  const filteredTenants = useMemo(() => {
    let filtered = tenants

    // Filter by branch
    if (selectedBranch) {
      filtered = filtered.filter(tenant => 
        tenant.rooms?.floors?.branch_id === selectedBranch
      )
    }

    // Filter by floor
    if (selectedFloor) {
      filtered = filtered.filter(tenant => 
        tenant.rooms?.floor_id === selectedFloor
      )
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(tenant => 
        tenant.full_name?.toLowerCase().includes(query) ||
        tenant.rooms?.room_number?.toString().includes(query) ||
        tenant.rooms?.floors?.branches?.name?.toLowerCase().includes(query) ||
        tenant.rooms?.floors?.name?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [tenants, selectedBranch, selectedFloor, searchQuery])

  // Reset floor filter when branch changes
  useEffect(() => {
    if (selectedBranch && selectedFloor) {
      const floor = floors.find(f => f.id === selectedFloor)
      if (floor && floor.branch_id !== selectedBranch) {
        setSelectedFloor('')
      }
    }
  }, [selectedBranch, selectedFloor, floors])

  // Calculate rental duration from check_in_requests or fallback to payment_due_date
  const calculateRentalDuration = (tenant: any) => {
    // First, try to get from check_in_requests
    const checkInRequest = tenant.check_in_requests?.[0]
    if (checkInRequest) {
      if (checkInRequest.rental_duration === 'daily' && checkInRequest.rental_days) {
        return `${checkInRequest.rental_days} hari`
      } else if (checkInRequest.rental_duration === '6months') {
        return '6 bulan'
      }
    }
    
    // Fallback: calculate from check_in_date and payment_due_date
    const checkIn = new Date(tenant.check_in_date)
    const due = new Date(tenant.payment_due_date)
    const diffTime = Math.abs(due.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 7) {
      return `${diffDays} hari`
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7)
      const days = diffDays % 7
      return days > 0 ? `${weeks} minggu ${days} hari` : `${weeks} minggu`
    } else if (diffDays <= 180) {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      return days > 0 ? `${months} bulan ${days} hari` : `${months} bulan`
    } else {
      const months = Math.floor(diffDays / 30)
      return `${months} bulan`
    }
  }

  const headers = ['Nama Penghuni', 'Kamar', 'Tgl Masuk', 'Durasi Sewa', 'Jatuh Tempo', 'Meteran Awal', 'Actions']
  const rows = filteredTenants.map(tenant => {
    const roomLabel = `No. ${tenant.rooms?.room_number} - ${tenant.rooms?.floors?.branches?.name}`
    const dueDate = new Date(tenant.payment_due_date)
    const isOverdue = dueDate < new Date()
    const rentalDuration = calculateRentalDuration(tenant)
    
    return [
      tenant.full_name,
      roomLabel,
      new Date(tenant.check_in_date).toLocaleDateString('id-ID'),
      rentalDuration,
      <span key={`due-${tenant.id}`} className={isOverdue ? 'text-red-500 font-bold' : ''}>{dueDate.toLocaleDateString('id-ID')}</span>,
      tenant.electricity_meter_start,
      <div key={`actions-${tenant.id}`} className="flex gap-2">
        <button
          onClick={() => {
            setSelectedTenant(tenant)
            setIsDetailModalOpen(true)
          }}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-all duration-150 active:scale-95 active:bg-blue-200"
        >
          Detail
        </button>
        <form 
          action={deleteAction} 
          className="inline-block"
          onSubmit={(e) => {
            if (!confirm(`Apakah Anda yakin ingin melakukan check-out untuk ${tenant.full_name}?`)) {
              e.preventDefault()
            } else {
              setDeletingId(tenant.id)
            }
          }}
        >
          <input type="hidden" name="id" value={tenant.id} />
          <SubmitButton
            variant="warning"
            className="px-4 py-2 text-sm font-medium"
            disabled={deletingId === tenant.id}
            loadingText="Memproses..."
          >
            Check-out
          </SubmitButton>
        </form>
      </div>
    ]
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Penghuni</h1>
          <p className="text-gray-600">Kelola data penghuni dan check-in/check-out</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Check-in Penghuni
        </button>
      </div>

      {/* Filters - Only show for owner */}
      {userRole === 'owner' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Penghuni</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, kamar, atau cabang..."
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Cabang</label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value)
                  if (e.target.value) {
                    // Reset floor when branch changes
                    setSelectedFloor('')
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="">Semua Cabang</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            {/* Floor Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Lantai</label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!selectedBranch}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Semua Lantai</option>
                {filteredFloors.map(floor => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name} - {floor.branches?.name || ''}
                  </option>
                ))}
              </select>
              {!selectedBranch && (
                <p className="mt-1 text-xs text-gray-500">Pilih cabang terlebih dahulu</p>
              )}
            </div>
          </div>

          {/* Active Filters Info */}
          {(selectedBranch || selectedFloor || searchQuery) && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Filter aktif:</span>
              {selectedBranch && (
                <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium flex items-center gap-1">
                  Cabang: {branches.find(b => b.id === selectedBranch)?.name}
                  <button
                    onClick={() => {
                      setSelectedBranch('')
                      setSelectedFloor('')
                    }}
                    className="ml-1 hover:text-pink-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedFloor && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center gap-1">
                  Lantai: {floors.find(f => f.id === selectedFloor)?.name}
                  <button
                    onClick={() => setSelectedFloor('')}
                    className="ml-1 hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
                  Pencarian: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedBranch('')
                  setSelectedFloor('')
                  setSearchQuery('')
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Hapus semua filter
              </button>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-900">{filteredTenants.length}</span> dari <span className="font-semibold text-gray-900">{tenants.length}</span> penghuni
          </div>
        </div>
      )}
      
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-semibold text-gray-900 mb-2">Tidak ada penghuni ditemukan</p>
          <p className="text-gray-600">
            {searchQuery || selectedBranch || selectedFloor 
              ? 'Coba ubah filter atau kata kunci pencarian'
              : 'Belum ada penghuni yang terdaftar'}
          </p>
        </div>
      ) : (
        <Table headers={headers} rows={rows} />
      )}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Check-in Penghuni Baru</h2>
        <form action={createAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kamar</label>
            <select 
              name="room_id" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              aria-label="Pilih kamar"
            >
              <option value="">Pilih Kamar</option>
              {availableRooms.length === 0 ? (
                <option value="" disabled>Tidak ada kamar tersedia</option>
              ) : (
                [...availableRooms].sort((a, b) => {
                  // Sort by room_number (handle both string and number)
                  const numA = parseInt(a.room_number) || 0
                  const numB = parseInt(b.room_number) || 0
                  return numA - numB
                }).map(room => {
                  const label = `No. ${room.room_number} - ${room.floors?.branches?.name || '-'} - ${room.floors?.name || '-'}`
                  return <option key={room.id} value={room.id}>{label}</option>
                })
              )}
            </select>
            {availableRooms.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">Tidak ada kamar yang tersedia untuk check-in.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
            <input 
              name="full_name" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan nama lengkap" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Link KTP / NIK</label>
            <input 
              name="id_card_url" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan link KTP/NIK" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Masuk</label>
            <input 
              name="check_in_date" 
              type="date" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jatuh Tempo Pembayaran</label>
            <input 
              name="payment_due_date" 
              type="date" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meteran Listrik Awal</label>
            <input 
              name="electricity_meter_start" 
              type="number" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan meteran awal" 
            />
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Memproses..."
            >
              Check-in
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => {
        setIsDetailModalOpen(false)
        setSelectedTenant(null)
      }}>
        {selectedTenant && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Detail Penghuni</h2>
            
            {/* Tenant Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Nama:</span>
                <span className="text-sm text-gray-900">{selectedTenant.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Kamar:</span>
                <span className="text-sm text-gray-900">No. {selectedTenant.rooms?.room_number} - {selectedTenant.rooms?.floors?.branches?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Tanggal Masuk:</span>
                <span className="text-sm text-gray-900">{new Date(selectedTenant.check_in_date).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Jatuh Tempo:</span>
                <span className="text-sm text-gray-900">{new Date(selectedTenant.payment_due_date).toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            {/* Photos Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Dokumen & Foto</h3>
              
              {/* KTP Photo */}
              {selectedTenant.check_in_requests?.[0]?.id_card_photo_url ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Foto KTP</label>
                  <div className="relative">
                    <img 
                      src={selectedTenant.check_in_requests[0].id_card_photo_url} 
                      alt="KTP" 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                </div>
              ) : selectedTenant.id_card_url ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Foto KTP</label>
                  <div className="relative">
                    <img 
                      src={selectedTenant.id_card_url} 
                      alt="KTP" 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                </div>
              ) : null}

              {/* Selfie Photo */}
              {selectedTenant.check_in_requests?.[0]?.selfie_photo_url && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Selfie</label>
                  <div className="relative">
                    <img 
                      src={selectedTenant.check_in_requests[0].selfie_photo_url} 
                      alt="Selfie" 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                </div>
              )}

              {/* Payment Proof */}
              {selectedTenant.check_in_requests?.[0]?.payment_proof_url && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bukti Pembayaran</label>
                  <div className="relative">
                    <img 
                      src={selectedTenant.check_in_requests[0].payment_proof_url} 
                      alt="Bukti Transfer" 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                </div>
              )}

              {(!selectedTenant.check_in_requests?.[0]?.id_card_photo_url && 
                !selectedTenant.id_card_url &&
                !selectedTenant.check_in_requests?.[0]?.selfie_photo_url && 
                !selectedTenant.check_in_requests?.[0]?.payment_proof_url) && (
                <div className="text-center py-8 text-gray-500">
                  <p>Dokumen tidak tersedia</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false)
                  setSelectedTenant(null)
                }}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-150 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}