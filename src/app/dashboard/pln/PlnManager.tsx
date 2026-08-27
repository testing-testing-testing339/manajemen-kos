'use client'

import { useState, useMemo, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePlnId } from './actions'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { 
  Zap, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Edit3, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react'

interface RoomItem {
  id: string
  room_number: string
  room_type: string
  is_occupied: boolean
  facilities: string[]
  floors: {
    id: string
    name: string
    branches: {
      name: string
    }
  }
}

export default function PlnManager({ 
  initialRooms = [],
  floors = []
}: { 
  initialRooms: RoomItem[]
  floors: any[]
}) {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'set' | 'unset'>('all')

  // Edit Modal State
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null)
  const [plnInput, setPlnInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [updateState, updateAction] = useActionState(updatePlnId, null)

  useEffect(() => {
    setRooms(initialRooms)
  }, [initialRooms])

  useEffect(() => {
    if (updateState?.success) {
      setEditingRoom(null)
      router.refresh()
    }
  }, [updateState, router])

  // Extract PLN ID helper
  const getPlnId = (facilities: string[] = []): string => {
    if (!Array.isArray(facilities)) return ''
    const match = facilities.find(
      (f: string) => f.toLowerCase().startsWith('id pln:') || f.toLowerCase().startsWith('pln:')
    )
    if (!match) return ''
    return match.replace(/^(id pln:|pln:)\s*/i, '').trim()
  }

  // Handle copy
  const handleCopy = (plnId: string, roomId: string) => {
    if (!plnId) return
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plnId).catch(() => {
        fallbackCopy(plnId)
      })
    } else {
      fallbackCopy(plnId)
    }
    setCopiedId(roomId)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
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

  // Open Edit Modal
  const openEditModal = (room: RoomItem) => {
    setEditingRoom(room)
    setPlnInput(getPlnId(room.facilities))
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = rooms.length
    const set = rooms.filter(r => Boolean(getPlnId(r.facilities))).length
    const unset = total - set
    return { total, set, unset }
  }, [rooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const orderMap: Record<string, number> = {
      'vip belakang warkop': 1,
      'dasar': 2,
      'gedung atas lt 2': 3,
      'gedung atas lt 3': 4
    }

    return rooms
      .filter(room => {
        const plnId = getPlnId(room.facilities)
        const q = searchQuery.toLowerCase().trim()
        
        const matchSearch = !q || 
          room.room_number.toLowerCase().includes(q) || 
          plnId.toLowerCase().includes(q) ||
          room.floors?.name?.toLowerCase().includes(q)

        const matchFloor = selectedFloor === 'all' || room.floors?.id === selectedFloor

        let matchStatus = true
        if (selectedStatus === 'set') matchStatus = Boolean(plnId)
        if (selectedStatus === 'unset') matchStatus = !plnId

        return matchSearch && matchFloor && matchStatus
      })
      .sort((a, b) => {
        const floorA = orderMap[a.floors?.name?.toLowerCase().trim() || ''] || 99
        const floorB = orderMap[b.floors?.name?.toLowerCase().trim() || ''] || 99
        if (floorA !== floorB) return floorA - floorB
        const numA = parseInt(a.room_number.replace(/\D/g, '')) || 0
        const numB = parseInt(b.room_number.replace(/\D/g, '')) || 0
        return numA - numB
      })
  }, [rooms, searchQuery, selectedFloor, selectedStatus])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Manajemen ID Meteran PLN
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Khusus Owner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola dan perbarui nomor ID Pelanggan PLN / Meteran Listrik untuk masing-masing kamar kos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://web.pln.co.id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Portal / Layanan PLN</span>
          </a>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kamar</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">Graha Aisyah Menteng</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terdaftar ID PLN</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{stats.set}</p>
            <p className="text-xs text-slate-500 mt-0.5">Siap isi token / pantau tagihan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Belum Diatur</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{stats.unset}</p>
            <p className="text-xs text-slate-500 mt-0.5">Perlu diisi nomor ID PLN</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no kamar atau ID PLN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Floor filter */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Lantai</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Status PLN</option>
              <option value="set">Sudah Ada ID PLN</option>
              <option value="unset">Belum Ada ID PLN</option>
            </select>

            {(searchQuery || selectedFloor !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedFloor('all')
                  setSelectedStatus('all')
                }}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Room PLN Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map(room => {
          const plnId = getPlnId(room.facilities)
          const isCopied = copiedId === room.id
          const isVip = room.room_type === 'vip' || room.room_number.toLowerCase().includes('vip')

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      {room.room_number}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        Kamar {room.room_number}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {room.floors?.name || 'Lantai -'} • {isVip ? 'VIP' : 'Standard'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    room.is_occupied
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {room.is_occupied ? 'Terisi' : 'Kosong'}
                  </span>
                </div>

                {/* ID PLN Box */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      ID Pelanggan / Meteran PLN:
                    </span>
                  </div>

                  {plnId ? (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                        {plnId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(plnId, room.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="Copy No ID PLN"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 italic">
                        Belum ada nomor ID PLN
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                      >
                        + Tambah
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {plnId ? 'ID Meteran Terpasang' : 'Perlu Konfigurasi'}
                </span>
                <button
                  type="button"
                  onClick={() => openEditModal(room)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{plnId ? 'Edit ID PLN' : 'Set ID PLN'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada kamar yang sesuai filter</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Ubah kata kunci pencarian atau reset filter untuk melihat daftar seluruh kamar.
          </p>
        </div>
      )}

      {/* Edit PLN Modal */}
      <Modal isOpen={Boolean(editingRoom)} onClose={() => setEditingRoom(null)} size="sm">
        {editingRoom && (
          <form action={updateAction} className="space-y-4 py-1">
            <input type="hidden" name="room_id" value={editingRoom.id} />

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-5 h-5 fill-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Edit No. ID PLN Kamar {editingRoom.room_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingRoom.floors?.name} • Graha Aisyah Menteng
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nomor ID Pelanggan PLN / No. Meter:
              </label>
              <input
                type="text"
                name="pln_id"
                required
                value={plnInput}
                onChange={(e) => setPlnInput(e.target.value)}
                placeholder="Contoh: 512345678901 atau 14235678901"
                className="w-full px-3.5 py-2.5 font-mono text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * Nomor 11-12 digit ID Pelanggan atau nomor seri meteran prabayar/pascabayar.
              </p>
            </div>

            {updateState?.error && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-200">
                {updateState.error}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="primary"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                loadingText="Menyimpan ID PLN..."
              >
                Simpan ID PLN
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
