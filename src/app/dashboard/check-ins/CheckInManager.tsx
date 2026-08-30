'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { approveCheckIn, rejectCheckIn, assignRoom } from './actions'
import Modal from '@/components/ui/Modal'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import QRCode from 'qrcode'
import { 
  UserCheck, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldCheck, 
  Building2, 
  ExternalLink, 
  DoorClosed, 
  CreditCard,
  Banknote,
  Download,
  Eye,
  Check,
  Phone,
  ZoomIn,
  Calendar,
  X,
  History,
  Inbox,
  Search,
  Filter,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'

type TabType = 'active' | 'history' | 'qrcode'

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
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [checkIns, setCheckIns] = useState(initialCheckIns)
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null)
  
  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  
  // History search and filter
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'rejected'>('all')

  // Lightbox for full screen photo view
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
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

    const channel = supabase
      .channel('check-ins-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_in_requests' },
        () => {
          router.refresh()
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
      setIsRejectModalOpen(false)
      setRejectionReason('')
      router.refresh()
    }
  }, [approveState, rejectState, assignState, router])

  const generateQR = async (branchId: string) => {
    setLoading(true)
    try {
      const siteUrl = window.location.origin
      const checkInUrl = `${siteUrl}/check-in`
      
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrDataUrl)

      await fetch('/api/branch/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId, qr_code_data: checkInUrl }),
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.download = `qr-code-checkin-graha-aisyah-menteng.png`
    link.href = qrCodeUrl
    link.click()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-800'}`}>
        {status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Selesai'}
      </span>
    )
  }

  const formatRentalDuration = (checkIn: any) => {
    if (checkIn.rental_duration === 'daily') {
      return `${checkIn.rental_days || 1} Hari`
    } else if (checkIn.rental_duration === 'weekly') {
      return `${checkIn.rental_weeks || Math.ceil((checkIn.rental_days || 7) / 7)} Minggu`
    } else if (checkIn.rental_duration === 'monthly' || checkIn.rental_duration === '6months') {
      return `${checkIn.rental_months || Math.ceil((checkIn.rental_days || 30) / 30)} Bulan`
    }
    return '-'
  }

  // Parse room type preference
  const getRoomPreference = (checkIn: any) => {
    if (!checkIn) return { name: 'Kamar Non-VIP (Standard)', isVip: false }
    if (checkIn.room_category === 'vip') {
      return { name: 'Kamar VIP (Lantai 1)', isVip: true }
    }
    if (checkIn.room_category === 'non_vip') {
      return { name: 'Kamar Non-VIP (Standard)', isVip: false }
    }
    try {
      if (checkIn.selected_room_type) {
        const parsed = typeof checkIn.selected_room_type === 'string' 
          ? JSON.parse(checkIn.selected_room_type) 
          : checkIn.selected_room_type
        if (parsed.category === 'vip' || parsed.name?.toLowerCase().includes('vip')) {
          return { name: 'Kamar VIP (Lantai 1)', isVip: true }
        }
      }
    } catch {}
    return { name: 'Kamar Non-VIP (Standard)', isVip: false }
  }

  // Helper to extract room condition
  const getRoomCondition = (facilities: string[] = []): string | null => {
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

  // Group available rooms by the 4 Sections
  const availableRoomsBySection = useMemo(() => {
    const orderMap: Record<string, number> = {
      'vip belakang warkop': 1,
      'dasar': 2,
      'gedung atas lt 2': 3,
      'gedung atas lt 3': 4
    }

    const map: Record<string, any[]> = {
      'VIP Belakang Warkop': [],
      'Dasar': [],
      'Gedung Atas Lt 2': [],
      'Gedung Atas Lt 3': []
    }

    availableRooms.forEach(room => {
      const floorName = room.floors?.name || (room.room_type === 'vip' ? 'VIP Belakang Warkop' : 'Dasar')
      if (!map[floorName]) map[floorName] = []
      map[floorName].push(room)
    })

    const sortFn = (a: any, b: any) => {
      const numA = parseInt(a.room_number?.toString().replace(/\D/g, '')) || 0
      const numB = parseInt(b.room_number?.toString().replace(/\D/g, '')) || 0
      return numA - numB
    }

    Object.keys(map).forEach(key => {
      map[key].sort(sortFn)
    })

    return map
  }, [availableRooms])

  // Backward compatibility alias
  const vipRooms = availableRoomsBySection['VIP Belakang Warkop'] || []
  const nonVipRooms = [
    ...(availableRoomsBySection['Dasar'] || []),
    ...(availableRoomsBySection['Gedung Atas Lt 2'] || []),
    ...(availableRoomsBySection['Gedung Atas Lt 3'] || [])
  ]

  // Smart Room Assignment Modal Opener
  const openAssignModal = (checkIn: any) => {
    setSelectedCheckIn(checkIn)
    const pref = getRoomPreference(checkIn)
    
    if (pref.isVip && vipRooms.length > 0) {
      setSelectedRoomId(vipRooms[0].id)
    } else if (!pref.isVip && nonVipRooms.length > 0) {
      setSelectedRoomId(nonVipRooms[0].id)
    } else if (availableRooms.length > 0) {
      setSelectedRoomId(availableRooms[0].id)
    } else {
      setSelectedRoomId('')
    }
    setIsAssignModalOpen(true)
  }

  // Helper to extract staff name
  const getStaffName = (checkIn: any) => {
    if (!checkIn) return null
    if (Array.isArray(checkIn.profiles) && checkIn.profiles.length > 0) {
      return checkIn.profiles[0]?.full_name || null
    }
    if (checkIn.profiles && typeof checkIn.profiles === 'object') {
      return checkIn.profiles.full_name || null
    }
    return null
  }

  // SEPARATION: Active / Latest Requests vs. Historical Requests
  const activeRequests = useMemo(() => {
    return checkIns.filter(c => c.status === 'pending' || (c.status === 'approved' && !c.assigned_room_id))
  }, [checkIns])

  const historyRequests = useMemo(() => {
    let list = checkIns.filter(c => c.status === 'completed' || c.status === 'rejected' || (c.status === 'approved' && c.assigned_room_id))

    if (historyStatusFilter === 'completed') {
      list = list.filter(c => c.status === 'completed' || (c.status === 'approved' && c.assigned_room_id))
    } else if (historyStatusFilter === 'rejected') {
      list = list.filter(c => c.status === 'rejected')
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim()
      list = list.filter(c => {
        const staff = getStaffName(c)
        const nameMatch = c.full_name?.toLowerCase().includes(q)
        const phoneMatch = c.phone?.toLowerCase().includes(q)
        const roomMatch = c.rooms?.room_number?.toString().toLowerCase().includes(q)
        const nikMatch = c.id_card_number?.toLowerCase().includes(q)
        const reasonMatch = c.rejection_reason?.toLowerCase().includes(q)
        const staffMatch = staff?.toLowerCase().includes(q)
        return nameMatch || phoneMatch || roomMatch || nikMatch || reasonMatch || staffMatch
      })
    }

    return list
  }, [checkIns, historyStatusFilter, historySearch])

  // Table headers for Active Tab
  const activeHeaders = ['Nama Tamu', 'Kategori Kamar', 'Durasi Sewa', 'Total + Deposit', 'Metode Bayar', 'Status & Petugas', 'Waktu Masuk', 'Aksi']
  
  const activeRows = activeRequests.map(checkIn => {
    const roomPref = getRoomPreference(checkIn)
    const isCash = checkIn.payment_destination?.toLowerCase().includes('cash') || checkIn.payment_destination?.toLowerCase().includes('resepsionis') || checkIn.payment_proof_url?.includes('placehold')

    return [
      <div key={`name-${checkIn.id}`}>
        <p className="font-bold text-slate-900">{checkIn.full_name}</p>
        <p className="text-[11px] text-slate-500">{checkIn.phone}</p>
      </div>,

      <span key={`pref-${checkIn.id}`} className={`px-2 py-0.5 rounded-md text-xs font-bold ${
        roomPref.isVip ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}>
        {roomPref.isVip ? 'VIP' : 'Non-VIP'}
      </span>,

      <span key={`dur-${checkIn.id}`} className="text-xs font-medium text-slate-700">
        {formatRentalDuration(checkIn)}
      </span>,

      <div key={`total-${checkIn.id}`}>
        <p className="text-xs font-bold text-indigo-600">
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(checkIn.total_amount))}
        </p>
        {parseFloat(checkIn.deposit_amount || '0') > 0 ? (
          <p className="text-[10px] text-amber-600 font-bold">Deposit Rp 100k (KTP Bebas)</p>
        ) : (
          <p className="text-[10px] text-rose-600 font-bold">Titip KTP Fisik</p>
        )}
      </div>,

      <span key={`method-${checkIn.id}`} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
        isCash ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
      }`}>
        {isCash ? 'Cash' : 'QRIS'}
      </span>,

      <div key={`status-${checkIn.id}`} className="space-y-0.5">
        {getStatusBadge(checkIn.status)}
        {checkIn.status === 'approved' && (
          <p className="text-[10px] text-blue-600 font-bold">
            Disetujui: {getStaffName(checkIn) || 'Petugas'}
          </p>
        )}
      </div>,

      <span key={`date-${checkIn.id}`} className="text-xs text-slate-500">
        {new Date(checkIn.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>,

      <div key={`action-${checkIn.id}`} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setSelectedCheckIn(checkIn)
            setIsDetailModalOpen(true)
          }}
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          Detail & Foto
        </button>

        <button
          type="button"
          onClick={() => openAssignModal(checkIn)}
          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          Setujui & Pilih Kamar
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCheckIn(checkIn)
            setRejectionReason('Foto KTP tidak jelas / buram, mohon upload ulang')
            setIsRejectModalOpen(true)
          }}
          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
        >
          Tolak
        </button>
      </div>
    ]
  })

  // Table headers for History Tab
  const historyHeaders = ['Nama Tamu', 'Kamar', 'Kategori', 'Durasi', 'Total Tagihan', 'Status & Info', 'Petugas', 'Tanggal', 'Aksi']

  const historyRows = historyRequests.map(checkIn => {
    const roomPref = getRoomPreference(checkIn)
    const rawStaff = getStaffName(checkIn)
    const staffName = rawStaff || (checkIn.status === 'completed' || checkIn.status === 'rejected' ? 'Resepsionis' : '-')

    // Resolve room display
    let roomDisplay = '-'
    if (checkIn.rooms?.room_number) {
      roomDisplay = `Kamar ${checkIn.rooms.room_number}`
    } else if (checkIn.status === 'rejected') {
      roomDisplay = 'Ditolak'
    } else {
      roomDisplay = roomPref.isVip ? 'Kamar VIP' : 'Kamar Non-VIP'
    }

    return [
      <div key={`hist-name-${checkIn.id}`}>
        <p className="font-bold text-slate-900">{checkIn.full_name}</p>
        <p className="text-[11px] text-slate-500">{checkIn.phone}</p>
      </div>,

      <span key={`hist-room-${checkIn.id}`} className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
        checkIn.status === 'rejected' 
          ? 'bg-rose-50 text-rose-700 border-rose-200' 
          : 'bg-slate-100 text-slate-900 border-slate-200 font-mono font-black'
      }`}>
        {roomDisplay}
      </span>,

      <span key={`hist-pref-${checkIn.id}`} className={`px-2 py-0.5 rounded-md text-xs font-bold ${
        roomPref.isVip ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}>
        {roomPref.isVip ? 'VIP' : 'Non-VIP'}
      </span>,

      <span key={`hist-dur-${checkIn.id}`} className="text-xs text-slate-700">
        {formatRentalDuration(checkIn)}
      </span>,

      <span key={`hist-tot-${checkIn.id}`} className="text-xs font-bold text-indigo-600">
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(checkIn.total_amount))}
      </span>,

      <div key={`hist-status-${checkIn.id}`} className="space-y-0.5">
        {getStatusBadge(checkIn.status)}
        {checkIn.status === 'rejected' && checkIn.rejection_reason && (
          <p className="text-[10px] text-rose-600 font-medium truncate max-w-[140px]" title={checkIn.rejection_reason}>
            {checkIn.rejection_reason}
          </p>
        )}
      </div>,

      <div key={`hist-staff-${checkIn.id}`} className="space-y-0.5">
        <p className="text-xs font-bold text-slate-800">{staffName}</p>
        {staffName !== '-' && (
          <p className="text-[10px] text-slate-400 font-medium">
            {checkIn.status === 'rejected' ? 'Petugas Penolak' : checkIn.status === 'completed' ? 'Petugas Penerima' : 'Petugas'}
          </p>
        )}
      </div>,

      <span key={`hist-date-${checkIn.id}`} className="text-xs text-slate-500">
        {new Date(checkIn.updated_at || checkIn.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>,

      <button
        key={`hist-act-${checkIn.id}`}
        type="button"
        onClick={() => {
          setSelectedCheckIn(checkIn)
          setIsDetailModalOpen(true)
        }}
        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
      >
        Lihat Detail & Foto
      </button>
    ]
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Manajemen Permintaan Check-in
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Verifikasi pemesanan tamu Graha Aisyah Menteng, kelola antrean masuk terbaru, dan arsip riwayat check-in
        </p>
      </div>

      {/* Tabs Switcher: Terbaru vs Riwayat vs QR Code */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex max-w-lg border border-slate-200/80">
        {/* Tab 1: Antrean Terbaru */}
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4 text-indigo-600" />
          <span>Permintaan Terbaru</span>
          {activeRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {activeRequests.length}
            </span>
          )}
        </button>

        {/* Tab 2: Riwayat Selesai */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>Riwayat ({checkIns.filter(c => c.status === 'completed' || c.status === 'rejected' || (c.status === 'approved' && c.assigned_room_id)).length})</span>
        </button>

        {/* Tab 3: QR Code Generator */}
        <button
          onClick={() => {
            setActiveTab('qrcode')
            if (!qrCodeUrl) generateQR(selectedBranch)
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qrcode'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-slate-600" />
          <span>QR Check-in</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ANTREAN PERMINTAAN TERBARU (ACTIONABLE)
      ========================================================================= */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-amber-600 uppercase">Menunggu Persetujuan</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {checkIns.filter(c => c.status === 'pending').length}
              </p>
              <p className="text-[10px] text-slate-400">Tamu baru mendaftar</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-blue-600 uppercase">Disetujui (Belum Pilih Kamar)</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {checkIns.filter(c => c.status === 'approved' && !c.assigned_room_id).length}
              </p>
              <p className="text-[10px] text-slate-400">Siap diberi nomor kamar</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Antrean Aktif</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{activeRequests.length}</p>
              <p className="text-[10px] text-slate-400">Graha Aisyah Menteng</p>
            </div>
          </div>

          {activeRequests.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <Table headers={activeHeaders} rows={activeRows} />
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Tidak ada antrean check-in baru</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Semua permintaan check-in telah diproses. Pengajuan check-in baru via scan QR akan muncul di sini secara otomatis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: RIWAYAT CHECK-IN (COMPLETED & REJECTED ARCHIVES)
      ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Search & Filter Controls for History */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, kamar, WA, NIK, atau alasan tolak..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={historyStatusFilter}
                onChange={(e: any) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Riwayat</option>
                <option value="completed">Selesai Check-in</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          {historyRequests.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <Table headers={historyHeaders} rows={historyRows} />
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum ada data riwayat yang cocok</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Riwayat tamu yang selesai check-in atau ditolak akan tersimpan rapi di halaman ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: QR CODE GENERATOR & CETAK
      ========================================================================= */}
      {activeTab === 'qrcode' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs max-w-xl mx-auto text-center space-y-6">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">QR Code Registrasi Graha Aisyah Menteng</h2>
            <p className="text-xs text-slate-500 mt-1">
              Cetak QR Code ini dan pasang di meja resepsionis agar tamu dapat scan dan check-in mandiri.
            </p>
          </div>

          {qrCodeUrl ? (
            <div className="space-y-4">
              <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-3xl shadow-lg">
                <img src={qrCodeUrl} alt="QR Code Check-in" className="w-56 h-56 mx-auto" />
              </div>
              <div>
                <button
                  onClick={downloadQR}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Unduh Gambar QR Code (.PNG)
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => generateQR(selectedBranch)}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              {loading ? 'Membuat QR...' : 'Buat QR Code'}
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          WIDE DETAIL & VERIFICATION MODAL (2XL WITH 3-COLUMN PHOTOS)
      ========================================================================= */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="2xl">
        {selectedCheckIn && (() => {
          const roomPref = getRoomPreference(selectedCheckIn)
          const rawStaff = getStaffName(selectedCheckIn)
          const staffName = rawStaff || (selectedCheckIn.status === 'completed' || selectedCheckIn.status === 'rejected' ? 'Resepsionis' : null)
          const isCash = selectedCheckIn.payment_destination?.toLowerCase().includes('cash') || selectedCheckIn.payment_destination?.toLowerCase().includes('resepsionis') || selectedCheckIn.payment_proof_url?.includes('placehold')
          const formattedPhone = selectedCheckIn.phone?.replace(/[^0-9]/g, '') || ''
          
          // Compose prefilled WhatsApp message
          let waText = `Halo ${selectedCheckIn.full_name}, kami dari pengelola Graha Aisyah Menteng.`
          if (selectedCheckIn.status === 'rejected') {
            waText += ` Mohon maaf, pendaftaran check-in Anda belum dapat kami setujui karena: "${selectedCheckIn.rejection_reason || 'Berkas kurang lengkap / tidak sesuai'}". Silakan hubungi kami untuk informasi lebih lanjut atau lakukan pendaftaran ulang.`
          } else if (selectedCheckIn.status === 'completed') {
            waText += ` Terima kasih, check-in Anda untuk Kamar ${selectedCheckIn.rooms?.room_number || ''} telah terkonfirmasi.`
          }
          const waUrl = formattedPhone ? `https://wa.me/${formattedPhone.startsWith('0') ? '62' + formattedPhone.slice(1) : formattedPhone}?text=${encodeURIComponent(waText)}` : '#'

          return (
            <div className="space-y-6 py-1">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Detail Tamu: {selectedCheckIn.full_name}
                    </h2>
                    {getStatusBadge(selectedCheckIn.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pengajuan ID: <span className="font-mono text-indigo-600 font-semibold">{selectedCheckIn.id}</span> • Masuk pada {new Date(selectedCheckIn.created_at).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {formattedPhone && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Chat WhatsApp Tamu
                    </a>
                  )}
                </div>
              </div>

              {/* REJECTION REASON BANNER (IF REJECTED) */}
              {selectedCheckIn.status === 'rejected' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-800">Alasan Penolakan Check-in:</h4>
                      {staffName && (
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md">
                          Petugas: {staffName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-700 font-semibold">
                      {selectedCheckIn.rejection_reason || 'Data formulir tidak sesuai atau berkas identitas/bukti transfer tidak valid.'}
                    </p>
                  </div>
                </div>
              )}

              {/* APPROVED / COMPLETED BANNER WITH RESPONSIBLE STAFF */}
              {selectedCheckIn.status === 'completed' && staffName && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                        Petugas yang Bertanggung Jawab
                      </span>
                      <span className="text-xs font-black text-emerald-950">
                        Disetujui & Ditetapkan Kamar oleh: <strong>{staffName}</strong>
                      </span>
                    </div>
                  </div>
                  {selectedCheckIn.assigned_at && (
                    <span className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                      {new Date(selectedCheckIn.assigned_at).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              )}

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NIK KTP (16 Digit)</p>
                  <p className="text-xs font-black text-slate-900 font-mono">{selectedCheckIn.id_card_number || '-'}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kategori Kamar</p>
                  <p className={`text-xs font-extrabold ${roomPref.isVip ? 'text-purple-700' : 'text-slate-800'}`}>
                    {roomPref.isVip ? 'Kamar VIP' : 'Non-VIP / Standard'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Durasi Sewa</p>
                  <p className="text-xs font-black text-slate-900">{formatRentalDuration(selectedCheckIn)}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jaminan & Deposit</p>
                  {parseFloat(selectedCheckIn.deposit_amount || '0') > 0 ? (
                    <p className="text-xs font-black text-amber-600">
                      Deposit Rp 100k <span className="text-[10px] text-slate-500 font-normal">(KTP Bebas)</span>
                    </p>
                  ) : (
                    <p className="text-xs font-black text-rose-600">
                      Titip KTP Fisik <span className="text-[10px] text-rose-500 font-bold">(Wajib Tahan)</span>
                    </p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tagihan</p>
                  <p className="text-sm font-black text-indigo-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(selectedCheckIn.total_amount))}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metode Bayar</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isCash ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isCash ? 'Cash Resepsionis' : 'QRIS GoPay'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No. Kontak</p>
                  <p className="text-xs font-black text-slate-900">{selectedCheckIn.phone}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kamar Diassign</p>
                  <p className="text-xs font-black text-slate-900 font-mono">
                    {selectedCheckIn.rooms?.room_number ? `Kamar ${selectedCheckIn.rooms.room_number}` : (selectedCheckIn.status === 'rejected' ? 'Ditolak' : 'Belum Ditentukan')}
                  </p>
                </div>

                <div className="space-y-0.5 sm:col-span-2 md:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Petugas Bertanggung Jawab</p>
                  <p className="text-xs font-black text-indigo-950">
                    {staffName || (selectedCheckIn.status === 'pending' ? 'Belum Diproses (Menunggu)' : '-')}
                  </p>
                  {staffName && (
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {selectedCheckIn.status === 'rejected' ? 'Petugas yang menolak' : selectedCheckIn.status === 'completed' ? 'Petugas yang menyetujui & verifikasi' : 'Petugas penanggung jawab'}
                    </p>
                  )}
                </div>
              </div>

              {/* 3-COLUMN SIDE-BY-SIDE PHOTO VERIFICATION */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <span>Dokumen Verifikasi Identitas (Klik Foto untuk Memperbesar)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Foto KTP */}
                  <div className="bg-slate-900 rounded-2xl p-3 text-white border border-slate-800 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-300">1. Foto KTP Tamu</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">Rasio 1.58:1</span>
                      </div>
                      <div 
                        onClick={() => selectedCheckIn.id_card_photo_url && setZoomImage({ url: selectedCheckIn.id_card_photo_url, title: `KTP: ${selectedCheckIn.full_name}` })}
                        className="relative aspect-[1.58/1] bg-slate-950 rounded-xl overflow-hidden cursor-pointer border border-slate-700/60 flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        {selectedCheckIn.id_card_photo_url ? (
                          <img 
                            src={selectedCheckIn.id_card_photo_url} 
                            alt="Foto KTP" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Tidak ada foto KTP</span>
                        )}
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                            <ZoomIn className="w-5 h-5" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">Pastikan NIK & Nama sesuai data input</p>
                  </div>

                  {/* Foto Selfie */}
                  <div className="bg-slate-900 rounded-2xl p-3 text-white border border-slate-800 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-300">2. Foto Selfie Tamu</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">Wajah Asli</span>
                      </div>
                      <div 
                        onClick={() => selectedCheckIn.selfie_photo_url && setZoomImage({ url: selectedCheckIn.selfie_photo_url, title: `Selfie: ${selectedCheckIn.full_name}` })}
                        className="relative aspect-[1.58/1] bg-slate-950 rounded-xl overflow-hidden cursor-pointer border border-slate-700/60 flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        {selectedCheckIn.selfie_photo_url ? (
                          <img 
                            src={selectedCheckIn.selfie_photo_url} 
                            alt="Foto Selfie" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Tidak ada foto selfie</span>
                        )}
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                            <ZoomIn className="w-5 h-5" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">Cocokkan wajah tamu dengan foto KTP</p>
                  </div>

                  {/* Bukti Pembayaran */}
                  <div className="bg-slate-900 rounded-2xl p-3 text-white border border-slate-800 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-300">
                          {isCash ? '3. Foto Serah Terima Tunai' : '3. Bukti Transfer QRIS'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md ${isCash ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                          {isCash ? 'Foto Tunai di Meja' : 'QRIS GoPay'}
                        </span>
                      </div>
                      <div 
                        onClick={() => {
                          if (selectedCheckIn.payment_proof_url && !selectedCheckIn.payment_proof_url.includes('placehold')) {
                            setZoomImage({ 
                              url: selectedCheckIn.payment_proof_url, 
                              title: isCash ? `Foto Serah Terima Tunai: ${selectedCheckIn.full_name}` : `Bukti Transfer: ${selectedCheckIn.full_name}` 
                            })
                          }
                        }}
                        className="relative aspect-[1.58/1] bg-slate-950 rounded-xl overflow-hidden cursor-pointer border border-slate-700/60 flex items-center justify-center"
                      >
                        {selectedCheckIn.payment_proof_url && !selectedCheckIn.payment_proof_url.includes('placehold') ? (
                          <>
                            <img 
                              src={selectedCheckIn.payment_proof_url} 
                              alt={isCash ? 'Foto Serah Terima Tunai' : 'Bukti Transfer'} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                                <ZoomIn className="w-5 h-5" />
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3 space-y-1">
                            <Banknote className="w-8 h-8 text-amber-400 mx-auto" />
                            <p className="text-xs font-bold text-amber-300">Bayar Cash di Resepsionis</p>
                            <p className="text-[10px] text-slate-400">Belum ada foto serah terima</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                      {isCash ? 'Foto uang tunai saat diserahkan ke staf' : 'Cocokkan nominal transfer dengan tagihan'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {selectedCheckIn.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailModalOpen(false)
                          setRejectionReason('Foto KTP tidak jelas / buram, mohon upload ulang')
                          setIsRejectModalOpen(true)
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 cursor-pointer"
                      >
                        Tolak Permintaan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const c = selectedCheckIn
                          setIsDetailModalOpen(false)
                          openAssignModal(c)
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Setujui & Pilih Kamar
                      </button>
                    </>
                  )}

                  {selectedCheckIn.status === 'approved' && !selectedCheckIn.assigned_room_id && (
                    <button
                      type="button"
                      onClick={() => {
                        const c = selectedCheckIn
                        setIsDetailModalOpen(false)
                        openAssignModal(c)
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Pilih Kamar Sekarang
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* =========================================================================
          MODAL TOLAK PERMINTAAN DENGAN ALASAN
      ========================================================================= */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} size="md">
        {selectedCheckIn && (
          <form action={rejectAction} className="space-y-4 py-1">
            <input type="hidden" name="check_in_id" value={selectedCheckIn.id} />
            <input type="hidden" name="reason" value={rejectionReason} />
            <input type="hidden" name="rejection_reason" value={rejectionReason} />

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Tolak Permintaan Check-In</h2>
              <p className="text-xs text-slate-500">
                Penyewa: <strong>{selectedCheckIn.full_name}</strong> • {selectedCheckIn.phone}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Alasan Penolakan Cepat:</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  'Foto KTP tidak jelas / buram',
                  'Foto selfie tidak cocok dengan KTP',
                  'Bukti transfer tidak valid / belum masuk',
                  'Kamar pada kategori ini sudah penuh',
                  'Data identitas tidak lengkap'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      rejectionReason === reason
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold text-slate-700 mb-1">Kustomisasi Pesan Penolakan:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                rows={3}
                placeholder="Tuliskan alasan penolakan secara jelas untuk tamu..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {rejectState?.error && (
              <p className="text-xs text-rose-600 font-semibold">{rejectState.error}</p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="danger"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                loadingText="Menolak..."
              >
                Konfirmasi Tolak
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          ASSIGN ROOM MODAL (1-STEP APPROVAL & SMART CATEGORY ROOM ASSIGNMENT)
      ========================================================================= */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} size="md">
        {selectedCheckIn && (() => {
          const pref = getRoomPreference(selectedCheckIn)
          const primaryRooms = pref.isVip ? vipRooms : nonVipRooms
          const secondaryRooms = pref.isVip ? nonVipRooms : vipRooms
          const primaryLabel = pref.isVip 
            ? `KAMAR VIP (SESUAI PILIHAN TAMU - ${vipRooms.length} Kamar Tersedia)` 
            : `KAMAR NON-VIP (SESUAI PILIHAN TAMU - ${nonVipRooms.length} Kamar Tersedia)`
          const secondaryLabel = pref.isVip 
            ? `KAMAR NON-VIP / STANDARD (OPSI LAIN - ${nonVipRooms.length} Kamar Tersedia)` 
            : `KAMAR VIP (OPSI LAIN - ${vipRooms.length} Kamar Tersedia)`

          return (
            <form action={assignAction} className="space-y-4 py-1">
              <input type="hidden" name="check_in_id" value={selectedCheckIn.id} />
              
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900">Setujui & Tetapkan Kamar</h2>
                <p className="text-xs text-slate-500">
                  Tamu: <strong>{selectedCheckIn.full_name}</strong>
                </p>
              </div>

              {/* Guest Preference Banner */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 block">Kategori Pilihan Tamu</span>
                  <span className="font-extrabold text-indigo-950 text-sm">{pref.name}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-600 text-white shadow-xs">
                  {primaryRooms.length} Kamar Kosong
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Pilih Nomor Kamar (Graha Aisyah Menteng) *
                </label>
                <select
                  name="room_id"
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Kamar Kosong --</option>
                  
                  {/* All 4 Sections */}
                  {Object.entries(availableRoomsBySection).map(([sectionName, rooms]) => {
                    if (!rooms || rooms.length === 0) return null
                    const isPreferred = (pref.isVip && sectionName === 'VIP Belakang Warkop') || (!pref.isVip && sectionName !== 'VIP Belakang Warkop')
                    return (
                      <optgroup 
                        key={sectionName} 
                        label={`${isPreferred ? '[Pilihan Tamu] ' : ''}${sectionName.toUpperCase()} (${rooms.length} Kamar Tersedia)`}
                      >
                        {rooms.map(r => {
                          const cond = getRoomCondition(r.facilities)
                          return (
                            <option key={r.id} value={r.id}>
                              Kamar {r.room_number} • {sectionName} {cond ? `(Catatan: ${cond})` : ''}
                            </option>
                          )
                        })}
                      </optgroup>
                    )
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * Kunci kamar akan diserahkan setelah staf menetapkan nomor kamar ini.
                </p>
              </div>

              {assignState?.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">
                  {assignState.error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <SubmitButton
                  variant="success"
                  loadingText="Menyimpan..."
                  className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Konfirmasi & Selesaikan Check-in
                </SubmitButton>
              </div>
            </form>
          )
        })()}
      </Modal>

      {/* =========================================================================
          PORTALED HIGH-Z FULL SCREEN IMAGE LIGHTBOX
      ========================================================================= */}
      <ImageLightbox
        isOpen={!!zoomImage}
        url={zoomImage?.url}
        title={zoomImage?.title}
        onClose={() => setZoomImage(null)}
      />
    </div>
  )
}
