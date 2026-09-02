'use client'

import { useEffect, useState, useMemo } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment, confirmPayment, deletePayment } from './actions'
import Modal from '@/components/ui/Modal'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import Invoice from '@/components/Invoice'
import { getWIBDateString, formatWIBDate, getDailyRentalRate } from '@/lib/dateUtils'
import { 
  CreditCard, 
  Banknote, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  Search, 
  Filter, 
  FileText, 
  Receipt, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert,
  Building2, 
  Users, 
  Eye, 
  ChevronRight,
  Download,
  ExternalLink,
  X,
  Copy,
  Check,
  Layers,
  User,
  CalendarDays,
  Share2,
  Trash2
} from 'lucide-react'

type TabType = 'shift_report' | 'history' | 'tenants_status' | 'pending_confirmation'

export default function PaymentList({ 
  initialTenants, 
  initialPayments,
  allStaff = [],
  currentUser
}: { 
  initialTenants: any[], 
  initialPayments: any[],
  allStaff?: any[],
  currentUser?: { id: string; role: string; name?: string }
}) {
  const [tenants, setTenants] = useState(initialTenants)
  const [payments, setPayments] = useState(initialPayments)
  const [activeTab, setActiveTab] = useState<TabType>('shift_report')
  
  const isStaff = currentUser?.role === 'staff'
  const isOwner = currentUser?.role === 'owner'

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoicePayment, setInvoicePayment] = useState<any>(null)
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
  
  // KPI Detail Modals
  const [kpiModal, setKpiModal] = useState<'rent_revenue' | 'monthly_revenue' | 'deposits' | 'tenants_status' | 'shift_reconciliation' | 'shift_rent' | 'shift_deposit' | null>(null)
  const [depositFilterTab, setDepositFilterTab] = useState<'all' | 'with_deposit' | 'id_card'>('all')
  const [shiftModalFilter, setShiftModalFilter] = useState<'all' | 'rent' | 'deposit' | 'cash' | 'qris'>('all')
  
  // Filters for General History Tab
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  // Filters for Shift Report Tab
  const getTodayStr = () => {
    return getWIBDateString()
  }

  const [shiftDate, setShiftDate] = useState(getTodayStr())
  const [shiftStaffId, setShiftStaffId] = useState('all')
  const [shiftMethod, setShiftMethod] = useState('all')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const [paymentState, paymentAction] = useActionState(recordPayment, null)
  const [confirmState, confirmAction] = useActionState(confirmPayment, null)
  const [deleteState, deleteAction] = useActionState(deletePayment, null)
  const router = useRouter()

  // Sync state with props
  useEffect(() => {
    setTenants(initialTenants)
    setPayments(initialPayments)
  }, [initialTenants, initialPayments])

  useEffect(() => {
    if (paymentState?.success || confirmState?.success || deleteState?.success) {
      setIsModalOpen(false)
      setSelectedTenant(null)
      setPaymentToDelete(null)
      setIsDetailModalOpen(false)
      router.refresh()
    }
  }, [paymentState, confirmState, deleteState, router])

  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Set of paid tenant IDs
  const paidTenantIds = useMemo(() => {
    const paidIds = new Set<string>()
    payments.forEach((payment: any) => {
      const paymentDate = new Date(payment.payment_date)
      const isConfirmed = payment.status === undefined || payment.status === null || payment.status === 'confirmed'
      if (
        isConfirmed &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        payment.tenant_id
      ) {
        paidIds.add(payment.tenant_id)
      }
    })
    return paidIds
  }, [payments, currentMonth, currentYear])
  
  const getPaymentStatus = (tenant: any) => {
    if (!tenant.payment_due_date && !tenant.check_in_date) {
      return { hasPaid: true, isOverdue: false, dueDate: today }
    }
    const dueDate = new Date(tenant.payment_due_date || tenant.check_in_date)
    dueDate.setHours(23, 59, 59, 999)
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)

    // A tenant is Lunas if recorded in payments or if their active rental period is ongoing (due date >= today)
    const hasPaid = paidTenantIds.has(tenant.id) || (dueDate >= todayStart)
    const isOverdue = dueDate < todayStart && !paidTenantIds.has(tenant.id)
    return { hasPaid, isOverdue, dueDate }
  }

  // Financial Statistics
  const stats = useMemo(() => {
    const totalTenants = tenants.length
    const paidTenants = tenants.filter(t => getPaymentStatus(t).hasPaid).length
    const overdueTenants = tenants.filter(t => getPaymentStatus(t).isOverdue).length
    
    const confirmedPayments = payments.filter((p: any) => {
      return p.status === undefined || p.status === null || p.status === 'confirmed'
    })

    // 1. Titipan Uang Deposit: ONLY count active deposit from currently ACTIVE tenants
    // If tenant checked out or has 0 deposit, active liability becomes Rp 0!
    let totalActiveDeposit = 0
    tenants.forEach((t: any) => {
      const dep = t.deposit_amount !== undefined && t.deposit_amount !== null ? parseFloat(t.deposit_amount) : 0
      totalActiveDeposit += isNaN(dep) ? 0 : dep
    })

    let totalRentRevenue = 0
    let monthlyRentRevenue = 0

    confirmedPayments.forEach((p: any) => {
      const amount = parseFloat(p.amount) || 0
      const isClaimOrPenalty = p.payment_method === 'deposit_deduction' || 
        p.notes?.includes('[Klaim Deposit]') || 
        p.notes?.includes('[Pelunasan Check-Out]')

      let rent = 0
      if (isClaimOrPenalty) {
        // Claimed deposit / Penalty is revenue to kos!
        rent = amount
      } else {
        const tenant = p.tenants || tenants.find((t: any) => t.id === p.tenant_id)
        const checkInRequest = p.check_in_request
        const rawDeposit = parseFloat(
          tenant?.deposit_amount !== undefined && tenant?.deposit_amount !== null
            ? tenant.deposit_amount
            : (checkInRequest?.deposit_amount || p.deposit_amount || 0)
        )
        rent = (rawDeposit > 0 && amount > rawDeposit) ? (amount - rawDeposit) : amount
      }
      
      totalRentRevenue += rent

      const paymentDate = new Date(p.payment_date || p.created_at)
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        monthlyRentRevenue += rent
      }
    })
    
    const pendingCount = payments.filter((p: any) => p.status === 'pending' || (p.status === undefined && p.confirmed_by === null)).length

    return { totalTenants, paidTenants, overdueTenants, totalRentRevenue, totalDeposit: totalActiveDeposit, monthlyRentRevenue, pendingCount }
  }, [tenants, payments, paidTenantIds, currentMonth, currentYear, today])

  // Revenue Breakdown for KPI Modals (Clean Net Rent calculation)
  const revenueBreakdown = useMemo(() => {
    return payments
      .filter((p: any) => p.status === undefined || p.status === null || p.status === 'confirmed')
      .map((p: any) => {
        const tenant = p.tenants || tenants.find((t: any) => t.id === p.tenant_id)
        const checkInRequest = p.check_in_request
        const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
        const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
        const roomType = (tenant?.rooms?.room_type === 'vip' || roomNumber.toString().includes('vip')) ? 'VIP' : 'Standard'
        
        const isClaimOrPenalty = p.payment_method === 'deposit_deduction' || 
          p.notes?.includes('[Klaim Deposit]') || 
          p.notes?.includes('[Pelunasan Check-Out]')
        
        const grossAmount = parseFloat(p.amount) || 0
        let deposit = 0
        let netRent = 0
        
        if (isClaimOrPenalty) {
          deposit = 0
          netRent = grossAmount
        } else {
          const rawDeposit = parseFloat(
            tenant?.deposit_amount !== undefined && tenant?.deposit_amount !== null
              ? tenant.deposit_amount
              : (checkInRequest?.deposit_amount || p.deposit_amount || 0)
          )
          if (rawDeposit > 0 && grossAmount > rawDeposit) {
            deposit = rawDeposit
            netRent = grossAmount - rawDeposit
          } else {
            deposit = 0
            netRent = grossAmount
          }
        }

        const isCash = (p.payment_method || '').toLowerCase().includes('cash') || 
          (p.payment_method || '').toLowerCase().includes('tunai') ||
          p.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
          p.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
          p.notes?.toLowerCase().includes('tunai')

        return {
          id: p.id,
          paymentDate: p.payment_date || p.created_at,
          tenantName,
          roomNumber,
          roomType,
          grossAmount,
          deposit,
          netRent,
          isCash,
          isClaimOrPenalty,
          notes: p.notes,
          confirmedBy: p.profiles?.full_name || 'Resepsionis'
        }
      })
  }, [payments, tenants])

  // Active Deposits List from Active Tenants
  const activeDepositsList = useMemo(() => {
    return tenants.map((t: any) => {
      const dep = t.deposit_amount !== undefined && t.deposit_amount !== null ? parseFloat(t.deposit_amount) : 0
      const roomNumber = t.rooms?.room_number || '-'
      const roomType = (t.rooms?.room_type === 'vip' || roomNumber.toString().includes('vip')) ? 'VIP' : 'Standard'
      const depositAmount = isNaN(dep) ? 0 : dep
      return {
        id: t.id,
        tenantName: t.full_name,
        phone: t.phone || '-',
        roomNumber,
        roomType,
        checkInDate: t.check_in_date,
        paymentDueDate: t.payment_due_date,
        depositAmount,
        hasCashDeposit: depositAmount > 0
      }
    })
  }, [tenants])

  // Filtered Payments History
  const filteredPayments = useMemo(() => {
    return payments.filter((payment: any) => {
      const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
      const checkInRequest = payment.check_in_request
      const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
      const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || ''
      const invoiceCode = `INV-${payment.id?.substring(0, 8)}`

      const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
        (payment.payment_method || '').toLowerCase().includes('tunai') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
        payment.notes?.toLowerCase().includes('tunai')

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        tenantName.toLowerCase().includes(q) ||
        roomNumber.toString().toLowerCase().includes(q) ||
        invoiceCode.toLowerCase().includes(q) ||
        (payment.notes && payment.notes.toLowerCase().includes(q))

      let matchesDate = true
      if (dateFilter) {
        const pDate = payment.payment_date || (payment.created_at ? getWIBDateString(payment.created_at) : '')
        matchesDate = pDate === dateFilter
      }

      let matchesMethod = true
      if (methodFilter === 'cash') {
        matchesMethod = isCash
      } else if (methodFilter === 'transfer') {
        matchesMethod = !isCash
      }

      return matchesSearch && matchesDate && matchesMethod
    })
  }, [payments, tenants, searchQuery, dateFilter, methodFilter])

  // Helper method badge
  const getMethodBadge = (payment: any) => {
    const isDepositClaim = payment.payment_method === 'deposit_deduction' || payment.notes?.includes('[Klaim Deposit]')
    if (isDepositClaim) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-purple-600" />
          <span>Klaim Deposit (Ganti Rugi)</span>
        </span>
      )
    }

    const isCheckoutSettlement = payment.notes?.includes('[Pelunasan Check-Out]')
    const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
      (payment.payment_method || '').toLowerCase().includes('tunai') ||
      payment.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
      payment.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
      payment.notes?.toLowerCase().includes('tunai')

    if (isCheckoutSettlement) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
          <Banknote className="w-3 h-3 text-rose-600" />
          <span>Pelunasan Denda ({isCash ? 'Tunai' : 'Transfer'})</span>
        </span>
      )
    }

    if (isCash) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <Banknote className="w-3 h-3 text-amber-600" />
          <span>Tunai Resepsionis</span>
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
        <CreditCard className="w-3 h-3 text-indigo-600" />
        <span>QRIS GoPay</span>
      </span>
    )
  }

  // Helper transaction category badge (Denda Keterlambatan, Klaim Deposit, Transit, Sewa)
  const getTransactionTypeBadge = (payment: any) => {
    const isCheckoutSettlement = payment?.notes?.includes('[Pelunasan Check-Out]')
    const isDepositClaim = payment?.payment_method === 'deposit_deduction' || payment?.notes?.includes('[Klaim Deposit]')
    const isTransit = payment?.check_in_request?.rental_duration?.includes('transit') || payment?.notes?.toLowerCase().includes('transit')
    const rawDeposit = parseFloat(payment?.check_in_request?.deposit_amount || payment?.deposit_amount || 0)
    const hasDeposit = rawDeposit > 0

    if (isCheckoutSettlement) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px] border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
          <span>Denda Telat Check-Out</span>
        </span>
      )
    }

    if (isDepositClaim) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10px] border border-purple-300">
          <ShieldAlert className="w-3 h-3 text-purple-600 flex-shrink-0" />
          <span>Klaim Deposit Ganti Rugi</span>
        </span>
      )
    }

    if (isTransit) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300">
          <span>Transit Pagi (s/d 12:00)</span>
        </span>
      )
    }

    if (hasDeposit) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
          <span>Sewa + Titip Deposit</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
        <span>Sewa Kamar</span>
      </span>
    )
  }

  // Filtered Payments for Shift & Daily Report (Flexible Dates)
  const shiftPayments = useMemo(() => {
    return payments.filter((payment: any) => {
      // Exclude rejected
      if (payment.status === 'rejected') return false

      // Match date
      const pDateStr = payment.payment_date || (payment.created_at ? getWIBDateString(payment.created_at) : '')
      if (shiftDate && shiftDate !== 'all') {
        if (shiftDate === 'month') {
          const pDate = new Date(payment.created_at || payment.payment_date)
          if (pDate.getMonth() !== currentMonth || pDate.getFullYear() !== currentYear) {
            return false
          }
        } else if (pDateStr !== shiftDate) {
          return false
        }
      }

      // Match staff: Staff is strictly locked to their own account; Owner can filter
      if (isStaff) {
        if (payment.confirmed_by !== currentUser?.id) {
          return false
        }
      } else if (shiftStaffId !== 'all') {
        if (payment.confirmed_by !== shiftStaffId) {
          return false
        }
      }

      // Match method
      const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
        (payment.payment_method || '').toLowerCase().includes('tunai') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
        payment.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
        payment.notes?.toLowerCase().includes('tunai')

      if (shiftMethod === 'cash' && !isCash) return false
      if (shiftMethod === 'transfer' && isCash) return false

      return true
    })
  }, [payments, shiftDate, isStaff, currentUser?.id, shiftStaffId, shiftMethod, currentMonth, currentYear])

  // Shift Transactions Detailed Breakdown (Per Guest)
  const shiftBreakdown = useMemo(() => {
    return shiftPayments.map((p: any) => {
      const tenant = p.tenants || tenants.find((t: any) => t.id === p.tenant_id)
      const checkInRequest = p.check_in_request

      let extractedNameFromNotes = null
      let extractedRoomFromNotes = null
      if (p.notes) {
        const nameMatch = p.notes.match(/Tamu:\s*([^|]+)/i)
        if (nameMatch) extractedNameFromNotes = nameMatch[1].trim()
        const roomMatch = p.notes.match(/Kamar:\s*([^|]+)/i)
        if (roomMatch) extractedRoomFromNotes = roomMatch[1].trim()
      }

      const tenantName = tenant?.full_name || extractedNameFromNotes || checkInRequest?.full_name || 'Tamu'
      const tenantPhone = tenant?.phone || checkInRequest?.phone || '-'
      const roomNumber = tenant?.rooms?.room_number || extractedRoomFromNotes || checkInRequest?.rooms?.room_number || '-'
      const roomType = (tenant?.rooms?.room_type === 'vip' || roomNumber.toString().includes('vip') || roomNumber.toString() === '1') ? 'VIP Belakang Warkop' : 'Standard Room'
      const confirmedByStaff = p.profiles?.full_name || 'Staf Resepsionis'
      const paymentTime = new Date(p.created_at || p.payment_date).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const grossAmount = parseFloat(p.amount) || 0
      const isCash = (p.payment_method || '').toLowerCase().includes('cash') || 
        (p.payment_method || '').toLowerCase().includes('tunai') ||
        p.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
        p.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
        p.notes?.toLowerCase().includes('tunai')

      const isClaimOrPenalty = p.payment_method === 'deposit_deduction' || 
        p.notes?.includes('[Klaim Deposit]') || 
        p.notes?.includes('[Pelunasan Check-Out]')

      let deposit = 0
      let netRent = 0

      if (isClaimOrPenalty) {
        deposit = 0
        netRent = grossAmount
      } else {
        const rawDeposit = parseFloat(
          tenant?.deposit_amount !== undefined && tenant?.deposit_amount !== null
            ? tenant.deposit_amount
            : (checkInRequest?.deposit_amount || p.deposit_amount || 0)
        )
        if (rawDeposit > 0 && grossAmount > rawDeposit) {
          deposit = rawDeposit
          netRent = grossAmount - rawDeposit
        } else {
          deposit = 0
          netRent = grossAmount
        }
      }

      return {
        id: p.id,
        rawPayment: p,
        tenantName,
        tenantPhone,
        roomNumber,
        roomType,
        confirmedByStaff,
        paymentTime,
        paymentDate: p.payment_date || p.created_at,
        grossAmount,
        netRent,
        deposit,
        isCash,
        isClaimOrPenalty,
        notes: p.notes
      }
    })
  }, [shiftPayments, tenants])

  // Shift & Cash Totals with Deposit & Pure Rent (Laba Bersih) Breakdown
  const shiftStats = useMemo(() => {
    let totalCash = 0
    let totalQris = 0
    let countCash = 0
    let countQris = 0
    let totalNetRent = 0
    let totalDeposit = 0
    let totalCashRent = 0
    let totalCashDeposit = 0
    let totalQrisRent = 0
    let totalQrisDeposit = 0

    shiftBreakdown.forEach((item: any) => {
      if (item.isCash) {
        totalCash += item.grossAmount
        countCash++
        totalCashRent += item.netRent
        totalCashDeposit += item.deposit
      } else {
        totalQris += item.grossAmount
        countQris++
        totalQrisRent += item.netRent
        totalQrisDeposit += item.deposit
      }

      totalNetRent += item.netRent
      totalDeposit += item.deposit
    })

    return {
      totalCash,
      totalQris,
      totalGrand: totalCash + totalQris,
      totalNetRent,
      totalDeposit,
      totalCashRent,
      totalCashDeposit,
      totalQrisRent,
      totalQrisDeposit,
      totalCount: shiftPayments.length,
      countCash,
      countQris
    }
  }, [shiftBreakdown, shiftPayments.length])

  // Copy Shift Report Handler with Detailed Net Profit & Deposit Breakdown
  const handleCopyShiftReport = () => {
    const staffName = isStaff
      ? (currentUser?.name || 'Petugas Shift')
      : (shiftStaffId === 'all' 
          ? 'Semua Petugas' 
          : allStaff.find((s: any) => s.id === shiftStaffId)?.full_name || 'Petugas Shift')
    
    let formattedDate = ''
    if (shiftDate === 'all') {
      formattedDate = 'Semua Riwayat Tanggal'
    } else if (shiftDate === 'month') {
      formattedDate = `Bulan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
    } else {
      formattedDate = new Date(shiftDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    const formatIdr = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

    let reportText = `*LAPORAN SERAH TERIMA SHIFT*\n`
    reportText += `*Graha Aisyah Menteng*\n`
    reportText += `Tanggal: ${formattedDate}\n`
    reportText += `Petugas: ${staffName}\n\n`
    reportText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    reportText += `*💰 TOTAL KAS MASUK (KOTOR):*\n`
    reportText += `• Penerimaan Tunai (Cash): ${formatIdr(shiftStats.totalCash)} (${shiftStats.countCash} transaksi)\n`
    reportText += `• Penerimaan QRIS / Transfer: ${formatIdr(shiftStats.totalQris)} (${shiftStats.countQris} transaksi)\n`
    reportText += `• *Total Kas Diterima:* ${formatIdr(shiftStats.totalGrand)} (${shiftStats.totalCount} transaksi)\n`
    reportText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    reportText += `*📊 RINCIAN KOMPONEN & LABA BERSIH:*\n`
    reportText += `• *Pendapatan Sewa Murni (Laba Bersih):* ${formatIdr(shiftStats.totalNetRent)}\n`
    reportText += `  └ (Uang sewa kamar, pelunasan & denda hak milik kos)\n`
    reportText += `• *Titipan Deposit Masuk:* ${formatIdr(shiftStats.totalDeposit)}\n`
    reportText += `  └ (Uang jaminan tamu yang wajib dikembalikan saat checkout)\n`
    reportText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    if (shiftPayments.length > 0) {
      reportText += `*📝 RINCIAN TRANSAKSI:*\n`
      shiftPayments.forEach((p: any, idx: number) => {
        const tenant = p.tenants || tenants.find((t: any) => t.id === p.tenant_id)
        const checkInRequest = p.check_in_request
        const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu'
        const roomNum = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
        const pTime = new Date(p.created_at || p.payment_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        const isCash = (p.payment_method || '').toLowerCase().includes('cash') || 
          (p.payment_method || '').toLowerCase().includes('tunai') ||
          p.check_in_request?.payment_destination?.toLowerCase().includes('cash') ||
          p.check_in_request?.payment_destination?.toLowerCase().includes('resepsionis') ||
          p.notes?.toLowerCase().includes('tunai')
        const methodStr = isCash ? 'Tunai' : 'QRIS'
        const pStaff = p.profiles?.full_name || 'Resepsionis'

        const grossAmount = parseFloat(p.amount) || 0
        const isClaimOrPenalty = p.payment_method === 'deposit_deduction' || 
          p.notes?.includes('[Klaim Deposit]') || 
          p.notes?.includes('[Pelunasan Check-Out]')
        
        let deposit = 0
        let netRent = 0
        if (isClaimOrPenalty) {
          deposit = 0
          netRent = grossAmount
        } else {
          const rawDeposit = parseFloat(
            tenant?.deposit_amount !== undefined && tenant?.deposit_amount !== null
              ? tenant.deposit_amount
              : (checkInRequest?.deposit_amount || p.deposit_amount || 0)
          )
          if (rawDeposit > 0 && grossAmount > rawDeposit) {
            deposit = rawDeposit
            netRent = grossAmount - rawDeposit
          } else {
            deposit = 0
            netRent = grossAmount
          }
        }

        let detailTag = ''
        if (deposit > 0) {
          detailTag = ` [Sewa: ${formatIdr(netRent)} + Deposit: ${formatIdr(deposit)}]`
        } else if (p.notes?.includes('[Pelunasan Check-Out]')) {
          detailTag = ` [Pelunasan Denda]`
        } else if (p.notes?.includes('[Klaim Deposit]')) {
          detailTag = ` [Klaim Deposit Ganti Rugi]`
        } else {
          detailTag = ` [Sewa Murni]`
        }

        reportText += `${idx + 1}. [${pTime}] ${tenantName} (Kamar ${roomNum})\n`
        reportText += `   └ ${methodStr}: ${formatIdr(grossAmount)}${detailTag} • Petugas: ${pStaff}\n`
      })
    } else {
      reportText += `(Tidak ada transaksi pada filter ini)\n`
    }

    navigator.clipboard.writeText(reportText).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 3000)
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pembayaran & Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Graha Aisyah Menteng • Rekap kas harian, serah terima shift, kuitansi digital, dan tagihan sewa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Graha Aisyah Menteng</span>
          </span>
        </div>
      </div>

      {/* Modern Luxury Stats Cards (Interactive Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan Sewa Murni */}
        <div 
          onClick={() => setKpiModal('rent_revenue')}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 text-white shadow-sm border border-slate-800 flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-indigo-500/50 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">Pendapatan Sewa Murni</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalRentRevenue)}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Eksklusif Uang Deposit</span>
              </p>
              <span className="text-[10px] text-indigo-300 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                Rincian <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Pendapatan Bulan Ini */}
        <div 
          onClick={() => setKpiModal('monthly_revenue')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-indigo-300 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">Pendapatan Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.monthlyRentRevenue)}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-400">
                Periode {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
              <span className="text-[10px] text-indigo-600 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                Rincian <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Titipan Deposit (Refundable) */}
        <div 
          onClick={() => setKpiModal('deposits')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-amber-300 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">Titipan Uang Deposit</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalDeposit)}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-400">Dikembalikan saat checkout</p>
              <span className="text-[10px] text-amber-600 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                Lihat Penghuni <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Kepatuhan Bayar Penghuni */}
        <div 
          onClick={() => setKpiModal('tenants_status')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-emerald-300 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600 transition-colors">Penghuni Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.paidTenants}
                  <span className="text-sm font-bold text-slate-400"> / {stats.totalTenants}</span>
                </p>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {stats.totalTenants > 0 ? Math.round((stats.paidTenants / stats.totalTenants) * 100) : 100}%
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                Daftar <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status tagihan sewa lunas</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex overflow-x-auto max-w-full sm:max-w-3xl border border-slate-200/80 gap-1 shadow-2xs">
        <button
          onClick={() => setActiveTab('shift_report')}
          className={`flex-1 min-w-[130px] sm:min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'shift_report'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Rekap Kas Shift</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700">
            {shiftPayments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Semua Transaksi</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tenants_status')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tenants_status'
              ? 'bg-white text-indigo-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-slate-600" />
          <span>Tagihan Penghuni</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {tenants.length}
          </span>
        </button>

        {stats.pendingCount > 0 && (
          <button
            onClick={() => setActiveTab('pending_confirmation')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pending_confirmation'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Verifikasi ({stats.pendingCount})</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: REKAP KAS SHIFT & SERAH TERIMA
      ========================================================================= */}
      {activeTab === 'shift_report' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Rekapitulasi Kas & Serah Terima Shift</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian uang tunai dan QRIS per shift/petugas untuk memastikan kesesuaian fisik kas saat pergantian shift
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Date Selectors */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShiftDate(getTodayStr())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    shiftDate === getTodayStr() ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date()
                    y.setDate(y.getDate() - 1)
                    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
                    setShiftDate(yStr)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    shiftDate !== getTodayStr() && shiftDate !== 'month' && shiftDate !== 'all' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kemarin
                </button>
                <button
                  type="button"
                  onClick={() => setShiftDate('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    shiftDate === 'month' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => setShiftDate('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    shiftDate === 'all' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Tanggal
                </button>
              </div>

              {/* Date Picker */}
              <input
                type="date"
                value={shiftDate === 'month' || shiftDate === 'all' ? '' : shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {/* Staff Selector (Only visible for Owner, hidden for Staff) */}
              {!isStaff ? (
                <select
                  value={shiftStaffId}
                  onChange={(e) => setShiftStaffId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Semua Petugas Shift</option>
                  {allStaff.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role === 'owner' ? 'Owner' : 'Staff'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Petugas: {currentUser?.name || 'Shift Saya'}</span>
                </span>
              )}

              {/* Method Filter */}
              <select
                value={shiftMethod}
                onChange={(e) => setShiftMethod(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Hanya Tunai (Cash)</option>
                <option value="transfer">Hanya QRIS / Transfer</option>
              </select>

              {/* Copy Shift Report Button */}
              <button
                type="button"
                onClick={handleCopyShiftReport}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Salin ringkasan teks untuk dikirim ke WhatsApp"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Rekap Shift</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Glassmorphism Financial Core Suite */}
          <div className="space-y-3">
            {/* Top 3 Core Financial Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Laba Bersih (Sewa Murni) */}
              <div 
                onClick={() => { setShiftModalFilter('rent'); setKpiModal('shift_reconciliation') }}
                className="relative overflow-hidden rounded-3xl p-5 bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_35px_rgba(16,185,129,0.12)] hover:border-emerald-400/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-400/10 via-teal-300/5 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Laba Bersih (Sewa Murni)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-2xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalNetRent)}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80 text-xs">
                    <span className="text-slate-500 font-medium">Sewa Kamar + Denda</span>
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Detail Transaksi <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Titipan Deposit Masuk */}
              <div 
                onClick={() => { setShiftModalFilter('deposit'); setKpiModal('shift_reconciliation') }}
                className="relative overflow-hidden rounded-3xl p-5 bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_35px_rgba(168,85,247,0.12)] hover:border-purple-400/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-400/10 via-indigo-300/5 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-800 border border-purple-500/20">
                    <ShieldAlert className="w-3 h-3 text-purple-600" />
                    Titipan Deposit Masuk
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-purple-700 transition-colors">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalDeposit)}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80 text-xs">
                    <span className="text-slate-500 font-medium">Uang Jaminan (Wajib Kembali)</span>
                    <span className="text-purple-700 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Detail Tamu <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Total Kas Masuk (Kotor) */}
              <div 
                onClick={() => { setShiftModalFilter('all'); setKpiModal('shift_reconciliation') }}
                className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_16px_40px_rgba(99,102,241,0.2)] hover:border-indigo-500/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
                <div className="flex items-center justify-between relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-indigo-300 border border-white/10">
                    Total Kas Masuk (Kotor)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center border border-white/10 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalGrand)}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-xs">
                    <span className="text-slate-400 font-medium">{shiftStats.totalCount} Transaksi Masuk</span>
                    <span className="text-indigo-300 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Buka Rekonsiliasi <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 2 Channel Breakdown Cards (Tunai vs QRIS Glass) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tunai (Cash) */}
              <div 
                onClick={() => { setShiftModalFilter('cash'); setKpiModal('shift_reconciliation') }}
                className="p-3.5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/40 transition-all cursor-pointer flex items-center justify-between shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Penerimaan Tunai (Fisik)</span>
                    <span className="text-base font-black font-mono text-slate-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalCash)}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20 font-mono">
                  {shiftStats.countCash} Tamu Tunai
                </span>
              </div>

              {/* QRIS / Transfer */}
              <div 
                onClick={() => { setShiftModalFilter('qris'); setKpiModal('shift_reconciliation') }}
                className="p-3.5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer flex items-center justify-between shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Penerimaan QRIS / TF (Bank)</span>
                    <span className="text-base font-black font-mono text-slate-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalQris)}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-800 border border-indigo-500/20 font-mono">
                  {shiftStats.countQris} Tamu QRIS
                </span>
              </div>
            </div>
          </div>

          {/* Shift Transactions Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Rincian Transaksi Shift:
            </h3>

            {shiftPayments.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 overflow-x-auto w-full shadow-2xs">
                <table className="w-full min-w-[720px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4 whitespace-nowrap">Waktu</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Tamu</th>
                      <th className="py-3 px-4 whitespace-nowrap">Kamar</th>
                      <th className="py-3 px-4 whitespace-nowrap">Metode Bayar</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nominal</th>
                      <th className="py-3 px-4 whitespace-nowrap">Petugas Penerima</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {shiftPayments.map((payment: any) => {
                      const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                      const checkInRequest = payment.check_in_request
                      const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu'
                      const tenantPhone = tenant?.phone || checkInRequest?.phone || '-'
                      const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
                      const confirmedByStaff = payment.profiles?.full_name || 'Staf Resepsionis'
                      const paymentTime = new Date(payment.created_at || payment.payment_date).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })

                      return (
                        <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {paymentTime} WIB
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{tenantName}</p>
                              {getTransactionTypeBadge(payment)}
                            </div>
                            <p className="text-[11px] text-slate-400">{tenantPhone}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-800">
                              Kamar {roomNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getMethodBadge(payment)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(payment.amount))}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px]">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{confirmedByStaff}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayment(payment)
                                  setIsDetailModalOpen(true)
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Kuitansi
                              </button>

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentToDelete(payment)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                                  title="Hapus Transaksi (Khusus Owner)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-bold text-slate-700">Tidak ada transaksi pada filter ini</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih tanggal atau petugas lain untuk melihat rekap kas
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RIWAYAT TRANSAKSI LENGKAP
      ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama penghuni, kamar, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Metode</option>
                <option value="transfer">QRIS / Bank Transfer</option>
                <option value="cash">Tunai Resepsionis</option>
              </select>

              {(searchQuery || dateFilter || methodFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setDateFilter('')
                    setMethodFilter('all')
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          {filteredPayments.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-x-auto w-full shadow-2xs">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Tanggal Transaksi</th>
                    <th className="py-3 px-4 whitespace-nowrap">Nama Penghuni</th>
                    <th className="py-3 px-4 whitespace-nowrap">Kamar</th>
                    <th className="py-3 px-4 whitespace-nowrap">Nominal</th>
                    <th className="py-3 px-4 whitespace-nowrap">Metode Bayar</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap">Dikonfirmasi Oleh</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {filteredPayments.map((payment: any) => {
                    const tenant = payment.tenants || tenants.find((t: any) => t.id === payment.tenant_id)
                    const checkInRequest = payment.check_in_request
                    const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
                    const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
                    const roomType = tenant?.rooms?.room_type === 'vip' ? 'VIP' : 'Standard'
                    const isConfirmed = payment.status === undefined || payment.status === null || payment.status === 'confirmed'

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {formatWIBDate(payment.payment_date || payment.created_at)}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{tenantName}</p>
                          <p className="text-[10px] font-mono text-slate-400">INV-{payment.id?.substring(0, 8).toUpperCase()}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs">
                            {roomNumber !== '-' ? `Kamar ${roomNumber}` : 'Kamar -'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {(() => {
                            const totalAmount = parseFloat(payment.amount) || 0
                            const isDepositClaim = payment.payment_method === 'deposit_deduction' || payment.notes?.includes('[Klaim Deposit]')
                            const isCheckoutSettlement = payment.notes?.includes('[Pelunasan Check-Out]')

                            if (isDepositClaim) {
                              return (
                                <div>
                                  <p className="font-mono font-extrabold text-purple-700 text-sm">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                                  </p>
                                  <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                    (Klaim Deposit - Ganti Rugi)
                                  </p>
                                </div>
                              )
                            }

                            if (isCheckoutSettlement) {
                              return (
                                <div>
                                  <p className="font-mono font-extrabold text-rose-700 text-sm">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                                  </p>
                                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                    (Pelunasan Denda/Kerusakan)
                                  </p>
                                </div>
                              )
                            }

                            const depositAmount = parseFloat(
                              tenant?.deposit_amount !== undefined && tenant?.deposit_amount !== null
                                ? tenant.deposit_amount
                                : (payment.check_in_request?.deposit_amount || payment.deposit_amount || 0)
                            )
                            const rentAmount = (depositAmount > 0 && totalAmount > depositAmount) ? (totalAmount - depositAmount) : totalAmount
                            
                            return (
                              <div>
                                <p className="font-mono font-extrabold text-indigo-600 text-sm">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentAmount)}
                                </p>
                                {depositAmount > 0 && (
                                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                    + {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(depositAmount)} (Deposit)
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </td>

                        <td className="py-3.5 px-4">
                          {getMethodBadge(payment)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isConfirmed 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isConfirmed ? 'Dikonfirmasi' : 'Menunggu'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {payment.profiles?.full_name || 'Admin Graha Menteng'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsDetailModalOpen(true)
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setInvoicePayment(payment)
                                setIsInvoiceModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>

                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => setPaymentToDelete(payment)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                                title="Hapus Transaksi (Khusus Owner)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center border border-slate-200 rounded-2xl bg-slate-50">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Tidak ada riwayat pembayaran yang sesuai</h3>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter tanggal.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: STATUS TAGIHAN PENGHUNI AKTIF
      ========================================================================= */}
      {activeTab === 'tenants_status' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Status Tagihan Penghuni Aktif</h2>
              <p className="text-xs text-slate-400">Jadwal jatuh tempo sewa dan catatan pembayaran per kamar</p>
            </div>
          </div>

          {tenants.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-x-auto w-full shadow-2xs">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold tracking-wider uppercase">
                    <th className="py-3.5 px-4 whitespace-nowrap">Nama Penghuni</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Kamar</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tanggal Masuk</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Jatuh Tempo</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status Tagihan</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tenants.map(tenant => {
                    const status = getPaymentStatus(tenant)
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{tenant.full_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs">
                            Kamar {tenant.rooms?.room_number || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {tenant.payment_due_date ? new Date(tenant.payment_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            status.hasPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status.isOverdue 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {status.hasPaid ? 'Lunas' : status.isOverdue ? 'Jatuh Tempo' : 'Menunggu Bayar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant)
                              setIsModalOpen(true)
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Catat Bayar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center border border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-xs text-slate-400">Belum ada data penghuni aktif.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          INVOICE MODAL (CLEAN FULL PREVIEW)
      ========================================================================= */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} size="2xl">
        {invoicePayment && (() => {
          const tenant = invoicePayment.tenants || tenants.find((t: any) => t.id === invoicePayment.tenant_id)
          const checkInRequest = invoicePayment.check_in_request
          const confirmedBy = invoicePayment.profiles

          return (
            <div className="py-2">
              <Invoice
                payment={invoicePayment}
                tenant={tenant}
                checkInRequest={checkInRequest}
                confirmedBy={confirmedBy}
              />
            </div>
          )
        })()}
      </Modal>

      {/* =========================================================================
          PAYMENT DETAIL MODAL WITH PAYMENT PROOF PHOTO
      ========================================================================= */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
        {selectedPayment && (() => {
          const tenant = selectedPayment.tenants || tenants.find((t: any) => t.id === selectedPayment.tenant_id)
          const checkInRequest = selectedPayment.check_in_request
          const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu Checkout'
          const roomNumber = tenant?.rooms?.room_number || checkInRequest?.rooms?.room_number || '-'
          const roomType = (tenant?.rooms?.room_type === 'vip' || roomNumber.toString().includes('vip')) ? 'VIP' : 'Non-VIP / Standard'
          const proofUrl = selectedPayment.payment_proof_url || checkInRequest?.payment_proof_url
          
          const isCash = (selectedPayment.payment_method || '').toLowerCase().includes('cash') || 
            (selectedPayment.payment_method || '').toLowerCase().includes('tunai') ||
            checkInRequest?.payment_destination?.toLowerCase().includes('cash') ||
            checkInRequest?.payment_destination?.toLowerCase().includes('resepsionis') ||
            selectedPayment.notes?.toLowerCase().includes('tunai') ||
            (proofUrl && proofUrl.includes('placehold'))

          const isDepositClaim = selectedPayment.payment_method === 'deposit_deduction' || selectedPayment.notes?.includes('[Klaim Deposit]')
          const isCheckoutSettlement = selectedPayment.notes?.includes('[Pelunasan Check-Out]')

          const totalAmount = parseFloat(selectedPayment.amount) || 0
          const depositAmount = parseFloat(checkInRequest?.deposit_amount || selectedPayment.deposit_amount || 0)
          const rentAmount = (depositAmount > 0 && totalAmount > depositAmount && !isDepositClaim && !isCheckoutSettlement) ? (totalAmount - depositAmount) : totalAmount

          return (
            <div className="space-y-5 py-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Detail & Bukti Pembayaran</h2>
                  <p className="text-xs text-slate-400 font-mono">Invoice ID: INV-{selectedPayment.id?.substring(0, 8).toUpperCase()}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200">
                  Dikonfirmasi
                </span>
              </div>

              {/* 2-Column Grid: Transaction Info & Proof Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Transaction Details */}
                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rincian Transaksi</p>
                  
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Nama Penghuni:</span>
                    <span className="font-bold text-slate-900">{tenantName}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Kamar:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      Kamar {roomNumber} ({roomType})
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Durasi Sewa:</span>
                    <span className="font-bold text-slate-800 bg-indigo-50/80 text-indigo-900 border border-indigo-100/80 px-2 py-0.5 rounded text-xs">
                      {(() => {
                        if (isDepositClaim) return 'Klaim Deposit'
                        if (isCheckoutSettlement) return 'Pelunasan Check-Out'
                        let dType = checkInRequest?.rental_duration || tenant?.rental_duration || 'daily'
                        if (checkInRequest?.selected_room_type) {
                          try {
                            const p = typeof checkInRequest.selected_room_type === 'string' ? JSON.parse(checkInRequest.selected_room_type) : checkInRequest.selected_room_type
                            if (p?.rental_duration) dType = p.rental_duration
                          } catch (e) {}
                        }
                        if (dType === 'transit_morning' || dType === 'transit') return 'Sesi Pagi (s/d 12:00 WIB)'
                        if (dType === 'weekly') {
                          const w = checkInRequest?.rental_weeks || tenant?.rental_count || 1
                          return `${w} Minggu (${w * 7} Hari)`
                        }
                        if (dType === 'monthly') {
                          const m = checkInRequest?.rental_months || tenant?.rental_count || 1
                          return `${m} Bulan`
                        }
                        if (dType === 'daily') {
                          const d = checkInRequest?.rental_days || tenant?.rental_count || 1
                          return `${d} Hari (Harian)`
                        }
                        return tenant?.rental_duration || '1 Hari (Harian)'
                      })()}
                    </span>
                  </div>

                  {isDepositClaim ? (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5 bg-purple-50 p-2 rounded-lg border border-purple-100">
                      <span className="text-purple-900 font-semibold">Jenis Transaksi:</span>
                      <span className="font-mono font-extrabold text-purple-700 text-xs">
                        Klaim Deposit (Ganti Rugi / Denda)
                      </span>
                    </div>
                  ) : isCheckoutSettlement ? (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <span className="text-rose-900 font-semibold">Jenis Transaksi:</span>
                      <span className="font-mono font-extrabold text-rose-700 text-xs">
                        Pelunasan Denda & Kerusakan
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">
                        {(() => {
                          let dType = checkInRequest?.rental_duration || tenant?.rental_duration
                          let isEarly = false
                          if (checkInRequest?.selected_room_type) {
                            try {
                              const p = typeof checkInRequest.selected_room_type === 'string' ? JSON.parse(checkInRequest.selected_room_type) : checkInRequest.selected_room_type
                              if (p?.rental_duration) dType = p.rental_duration
                              if (p?.price_per_day === 150000) isEarly = true
                            } catch (e) {}
                          }
                          if (!isEarly && checkInRequest?.created_at && dType === 'daily') {
                            const { isMorningTransit } = getDailyRentalRate(checkInRequest.created_at)
                            if (isMorningTransit) isEarly = true
                          }
                          if (dType === 'transit_morning' || dType === 'transit') return 'Sewa Sesi Pagi (s/d 12:00):'
                          if (dType === 'weekly') return 'Sewa Mingguan:'
                          if (dType === 'monthly') return 'Sewa Bulanan:'
                          if (isEarly) return 'Sewa Kamar (Early Check-In):'
                          return 'Sewa Kamar:'
                        })()}
                      </span>
                      <span className="font-mono font-extrabold text-indigo-600 text-sm">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentAmount)}
                      </span>
                    </div>
                  )}

                  {depositAmount > 0 && !isDepositClaim && !isCheckoutSettlement && (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Titipan Deposit:</span>
                      <span className="font-mono font-bold text-amber-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(depositAmount)}
                        <span className="text-[10px] text-slate-400 block font-sans font-normal text-right">(Dikembalikan saat checkout)</span>
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">Total Masuk Kas:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Metode Bayar:</span>
                    <span className="font-bold text-slate-800">
                      {isDepositClaim ? 'Potongan / Klaim Deposit' : (isCash ? 'Tunai di Resepsionis' : 'QRIS GoPay / Transfer')}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Tanggal Bayar:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedPayment.payment_date || selectedPayment.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Dikonfirmasi Oleh:</span>
                    <span className="font-bold text-slate-800">{selectedPayment.profiles?.full_name || 'Admin Graha Menteng'}</span>
                  </div>

                  {selectedPayment.notes && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-0.5">Catatan:</span>
                      <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200/80">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Payment Proof Image */}
                <div className="bg-slate-900 rounded-2xl p-3.5 text-white border border-slate-800 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-300">Bukti Transfer / Pembayaran</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${isCash ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {isCash ? 'Tunai' : 'QRIS GoPay'}
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        if (!isCash && proofUrl && !proofUrl.includes('placehold')) {
                          setZoomImage({ url: proofUrl, title: `Bukti Bayar: ${tenantName} (Kamar ${roomNumber})` })
                        }
                      }}
                      className={`relative aspect-[1.4/1] bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center ${!isCash && proofUrl && !proofUrl.includes('placehold') ? 'cursor-pointer hover:opacity-95' : ''}`}
                    >
                      {!isCash && proofUrl && !proofUrl.includes('placehold') ? (
                        <>
                          <img 
                            src={proofUrl} 
                            alt="Bukti Pembayaran" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                              <span>Perbesar Foto</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 space-y-1.5">
                          <Banknote className="w-8 h-8 text-amber-400 mx-auto" />
                          <p className="text-xs font-bold text-amber-300">Pembayaran Tunai di Resepsionis</p>
                          <p className="text-[10px] text-slate-400">Uang tunai diterima langsung oleh staf</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    {proofUrl ? 'Klik foto untuk melihat ukuran penuh' : 'Transaksi tunai terverifikasi sistem'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        setPaymentToDelete(selectedPayment)
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 border border-rose-200 transition-colors"
                      title="Hapus transaksi ini dari sistem (Khusus Owner)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Transaksi (Owner)</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setInvoicePayment(selectedPayment)
                    setIsInvoiceModalOpen(true)
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Buka Kuitansi / Cetak Invoice</span>
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>



      {/* =========================================================================
          RECORD PAYMENT MODAL (TANDAI BAYAR)
      ========================================================================= */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        {selectedTenant && (
          <form action={paymentAction} className="space-y-4 py-1">
            <input type="hidden" name="tenant_id" value={selectedTenant.id} />
            
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Catat Pembayaran Sewa</h2>
              <p className="text-xs text-slate-500">
                Penyewa: <strong>{selectedTenant.full_name}</strong> • Kamar <strong>{selectedTenant.rooms?.room_number}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Pembayaran (Rp) *</label>
              <input
                type="number"
                name="amount"
                required
                defaultValue={selectedTenant.rooms?.price || 100000}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pembayaran *</label>
              <input
                type="date"
                name="payment_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran *</label>
              <select
                name="payment_method"
                required
                defaultValue="qris"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="qris">QRIS GoPay Merchant</option>
                <option value="cash">Tunai di Resepsionis</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Pembayaran perpanjangan sewa 1 bulan"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {paymentState?.error && (
              <p className="text-xs text-rose-600 font-semibold">{paymentState.error}</p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="primary"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                loadingText="Menyimpan..."
              >
                Simpan Pembayaran
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          KPI MODAL 1 & 2: RINCIAN PENDAPATAN SEWA MURNI / BULAN INI
      ========================================================================= */}
      <Modal isOpen={kpiModal === 'rent_revenue' || kpiModal === 'monthly_revenue'} onClose={() => setKpiModal(null)} size="2xl">
        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {kpiModal === 'rent_revenue' ? 'Rincian Sumber Pendapatan Sewa Murni' : `Rincian Pendapatan Bulan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
              </h2>
              <p className="text-xs text-slate-500">
                Daftar arus penerimaan kas yang telah dipisahkan dari uang titipan deposit tamu
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-full border border-indigo-200">
              {revenueBreakdown.length} Transaksi
            </span>
          </div>

          {/* Mini KPI Highlights inside modal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Uang Masuk (Bruto)</span>
              <p className="text-base font-black font-mono text-slate-900 mt-0.5">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                  revenueBreakdown.reduce((sum, item) => sum + item.grossAmount, 0)
                )}
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase">Deposit Dipisahkan</span>
              <p className="text-base font-black font-mono text-amber-800 mt-0.5">
                - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                  revenueBreakdown.reduce((sum, item) => sum + item.deposit, 0)
                )}
              </p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase">Pendapatan Sewa Bersih</span>
              <p className="text-base font-black font-mono text-indigo-900 mt-0.5">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                  revenueBreakdown.reduce((sum, item) => sum + item.netRent, 0)
                )}
              </p>
            </div>
          </div>

          {/* List Table */}
          <div className="rounded-2xl border border-slate-200 overflow-x-auto max-h-[380px] scrollbar-thin">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Tamu & Kamar</th>
                  <th className="py-2.5 px-3">Waktu Bayar</th>
                  <th className="py-2.5 px-3 text-right">Uang Masuk</th>
                  <th className="py-2.5 px-3 text-right">Potongan Deposit</th>
                  <th className="py-2.5 px-3 text-right">Sewa Bersih</th>
                  <th className="py-2.5 px-3 text-center">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {revenueBreakdown.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{item.tenantName}</p>
                      <span className="text-[10px] text-indigo-600 font-mono">Kamar {item.roomNumber} ({item.roomType})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                      {new Date(item.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(item.paymentDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.grossAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                      {item.deposit > 0 ? `- ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.deposit)}` : 'Rp 0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.netRent)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.isCash ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                        {item.isCash ? 'Tunai' : 'QRIS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setKpiModal(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          KPI MODAL 3: DAFTAR TITIPAN DEPOSIT PENGHUNI AKTIF
      ========================================================================= */}
      <Modal isOpen={kpiModal === 'deposits'} onClose={() => setKpiModal(null)} size="2xl">
        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Daftar Titipan Deposit Penghuni Aktif</h2>
              <p className="text-xs text-slate-500">
                Uang jaminan yang saat ini masih dipegang kas dan wajib dikembalikan saat tamu check-out
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Deposit Aktif</span>
              <span className="font-mono font-black text-amber-600 text-base">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.totalDeposit)}
              </span>
            </div>
          </div>

          {/* Info Alert Box */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Perhatian Kasir & Resepsionis:</strong> Uang deposit di bawah ini adalah milik tamu yang saat ini sedang aktif menempati kamar. Dana ini tidak boleh dianggap laba/omset dan wajib dikembalikan penuh saat pemeriksaan kamar check-out selesai (kecuali ada potongan denda/kerusakan).
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setDepositFilterTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                depositFilterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Penghuni ({activeDepositsList.length})
            </button>
            <button
              type="button"
              onClick={() => setDepositFilterTab('with_deposit')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                depositFilterTab === 'with_deposit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Titipan Uang Deposit ({activeDepositsList.filter(t => t.hasCashDeposit).length})
            </button>
            <button
              type="button"
              onClick={() => setDepositFilterTab('id_card')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                depositFilterTab === 'id_card'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              Jaminan KTP Fisik ({activeDepositsList.filter(t => !t.hasCashDeposit).length})
            </button>
          </div>

          {/* Table List */}
          <div className="rounded-2xl border border-slate-200 overflow-x-auto max-h-[360px] scrollbar-thin">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Nama Penghuni</th>
                  <th className="py-2.5 px-3">Kamar</th>
                  <th className="py-2.5 px-3">Tanggal Check-In</th>
                  <th className="py-2.5 px-3">Jenis Jaminan</th>
                  <th className="py-2.5 px-3 text-right">Nominal Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {activeDepositsList
                  .filter(t => {
                    if (depositFilterTab === 'with_deposit') return t.hasCashDeposit
                    if (depositFilterTab === 'id_card') return !t.hasCashDeposit
                    return true
                  })
                  .map((t, idx) => (
                    <tr key={t.id || idx} className={`hover:bg-slate-50/80 transition-colors ${t.hasCashDeposit ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {t.tenantName}
                        <span className="text-[10px] text-slate-400 block font-normal">{t.phone}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                          Kamar {t.roomNumber} ({t.roomType})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {t.checkInDate ? new Date(t.checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {t.hasCashDeposit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                            <Banknote className="w-3 h-3 text-amber-700" />
                            <span>Titipan Uang Tunai / Transfer</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>Titip KTP Fisik Asli</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                        {t.hasCashDeposit ? (
                          <span className="text-amber-700">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(t.depositAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans font-normal text-xs">Rp 0 (KTP)</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setKpiModal(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          KPI MODAL 4: STATUS PEMBAYARAN SELURUH PENGHUNI AKTIF
      ========================================================================= */}
      <Modal isOpen={kpiModal === 'tenants_status'} onClose={() => setKpiModal(null)} size="2xl">
        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Status Pembayaran Penghuni Aktif</h2>
              <p className="text-xs text-slate-500">
                Total {stats.paidTenants} dari {stats.totalTenants} penghuni berstatus lunas
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200">
              {stats.totalTenants > 0 ? Math.round((stats.paidTenants / stats.totalTenants) * 100) : 100}% Lunas
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-x-auto max-h-[380px] scrollbar-thin">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Nama Penghuni</th>
                  <th className="py-2.5 px-3">Kamar</th>
                  <th className="py-2.5 px-3">Tanggal Masuk</th>
                  <th className="py-2.5 px-3">Jatuh Tempo</th>
                  <th className="py-2.5 px-3 text-center">Status Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {tenants.map(tenant => {
                  const status = getPaymentStatus(tenant)
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{tenant.full_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs">
                          Kamar {tenant.rooms?.room_number || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {tenant.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {tenant.payment_due_date ? new Date(tenant.payment_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          status.hasPaid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : status.isOverdue 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {status.hasPaid ? 'Lunas' : status.isOverdue ? 'Jatuh Tempo' : 'Menunggu Bayar'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setKpiModal(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          KPI MODAL 5: REKONSILIASI KAS SHIFT / HARIAN RINCI (LABA vs DEPOSIT)
      ========================================================================= */}
      <Modal isOpen={kpiModal === 'shift_reconciliation' || kpiModal === 'shift_rent' || kpiModal === 'shift_deposit'} onClose={() => setKpiModal(null)} size="2xl">
        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Rekonsiliasi Kas Shift & Laba Bersih
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {shiftDate === 'all' ? 'Semua Tanggal' : shiftDate === 'month' ? 'Bulan Ini' : `Tanggal ${new Date(shiftDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian pemisahan uang sewa murni (laba hak kos) dan titipan uang deposit tamu
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-900 text-white font-extrabold text-xs rounded-full">
              {shiftBreakdown.length} Transaksi
            </span>
          </div>

          {/* 3 Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Kas Diterima (Kotor)</span>
              <p className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalGrand)}
              </p>
              <span className="text-[10px] text-slate-400">{shiftStats.totalCount} Transaksi Selesai</span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
              <span className="text-[10px] font-extrabold text-emerald-900 uppercase block">Laba Bersih (Sewa Murni)</span>
              <p className="text-lg font-black font-mono text-emerald-950 mt-0.5">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalNetRent)}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold">✓ Hak Milik & Omset Kos</span>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50">
              <span className="text-[10px] font-extrabold text-purple-900 uppercase block">Titipan Deposit Masuk</span>
              <p className="text-lg font-black font-mono text-purple-950 mt-0.5">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(shiftStats.totalDeposit)}
              </p>
              <span className="text-[10px] text-purple-700 font-bold">⚠️ Titipan (Wajib Dikembalikan)</span>
            </div>
          </div>

          {/* Filter Pills inside Modal */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setShiftModalFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                shiftModalFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Transaksi ({shiftBreakdown.length})
            </button>
            <button
              type="button"
              onClick={() => setShiftModalFilter('rent')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                shiftModalFilter === 'rent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Sewa Murni ({shiftBreakdown.filter(i => i.netRent > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setShiftModalFilter('deposit')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                shiftModalFilter === 'deposit'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Titipan Deposit ({shiftBreakdown.filter(i => i.deposit > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setShiftModalFilter('cash')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                shiftModalFilter === 'cash'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Tunai ({shiftBreakdown.filter(i => i.isCash).length})
            </button>
            <button
              type="button"
              onClick={() => setShiftModalFilter('qris')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                shiftModalFilter === 'qris'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              QRIS / TF ({shiftBreakdown.filter(i => !i.isCash).length})
            </button>
          </div>

          {/* Detailed Transaction Table */}
          <div className="rounded-2xl border border-slate-200 overflow-x-auto max-h-[360px] scrollbar-thin">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Waktu & Tamu</th>
                  <th className="py-2.5 px-3">Kamar</th>
                  <th className="py-2.5 px-3 text-right">Laba Bersih (Sewa)</th>
                  <th className="py-2.5 px-3 text-right">Titipan Deposit</th>
                  <th className="py-2.5 px-3 text-right">Total Dibayar</th>
                  <th className="py-2.5 px-3 text-center">Metode</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {shiftBreakdown
                  .filter(item => {
                    if (shiftModalFilter === 'rent') return item.netRent > 0
                    if (shiftModalFilter === 'deposit') return item.deposit > 0
                    if (shiftModalFilter === 'cash') return item.isCash
                    if (shiftModalFilter === 'qris') return !item.isCash
                    return true
                  })
                  .map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{item.tenantName}</span>
                          {getTransactionTypeBadge(item.rawPayment)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {item.paymentTime} WIB • {item.tenantPhone}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                          Kamar {item.roomNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.netRent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                        {item.deposit > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.deposit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.grossAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isCash ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.isCash ? 'Tunai' : 'QRIS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-medium text-slate-600">
                        {item.confirmedByStaff}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayment(item.rawPayment)
                            setIsDetailModalOpen(true)
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Kuitansi
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setKpiModal(null)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Selesai / Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL HAPUS TRANSAKSI PEMBAYARAN (KHUSUS OWNER)
      ========================================================================= */}
      <Modal isOpen={!!paymentToDelete} onClose={() => setPaymentToDelete(null)} size="sm">
        {paymentToDelete && (
          <form action={deleteAction} className="space-y-4 py-1">
            <input type="hidden" name="payment_id" value={paymentToDelete.id} />

            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Hapus Transaksi Pembayaran</h3>
                <p className="text-xs text-rose-600 font-semibold">Khusus Pemilik Kos (Owner)</p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 text-xs space-y-2.5 text-slate-700">
              <p className="font-bold text-rose-950">
                Apakah Anda yakin ingin menghapus transaksi ini dari sistem?
              </p>
              <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-rose-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Penghuni / Tamu:</span>
                  <span className="font-bold text-slate-800">
                    {paymentToDelete.tenants?.full_name || paymentToDelete.check_in_request?.full_name || 'Tamu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nominal Transaksi:</span>
                  <span className="font-bold font-mono text-rose-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(paymentToDelete.amount || 0))}
                  </span>
                </div>
                {paymentToDelete.notes && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-600">Ket:</span> {paymentToDelete.notes}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                * Transaksi ini akan dihapus secara permanen dari buku kas, rekap shift, dan laporan omset. Gunakan fitur ini untuk membersihkan data uji coba atau tamu masa transisi manual.
              </p>
            </div>

            {deleteState?.error && (
              <div className="p-2.5 bg-rose-100 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
                {deleteState.error}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton
                variant="danger"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                loadingText="Menghapus..."
              >
                Hapus Transaksi
              </SubmitButton>
            </div>
          </form>
        )}
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
