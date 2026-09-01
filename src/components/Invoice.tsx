'use client'

import { useRef } from 'react'
import { Printer, Send, Building2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react'

interface InvoiceProps {
  payment: any
  tenant?: any
  checkInRequest?: any
  confirmedBy?: any
}

export default function Invoice({ payment, tenant, checkInRequest, confirmedBy }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Get tenant name
  const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Tamu / Penghuni'
  
  // Get room info
  let roomNumberStr = '-'
  let roomTypeStr = 'Non-VIP / Standard'
  if (tenant?.rooms) {
    roomNumberStr = tenant.rooms.room_number?.toString() || '-'
    roomTypeStr = (tenant.rooms.room_type === 'vip' || roomNumberStr.toLowerCase().includes('vip')) ? 'VIP' : 'Non-VIP / Standard'
  } else if (checkInRequest?.rooms) {
    roomNumberStr = checkInRequest.rooms.room_number?.toString() || '-'
    roomTypeStr = (checkInRequest.rooms.room_type === 'vip' || roomNumberStr.toLowerCase().includes('vip')) ? 'VIP' : 'Non-VIP / Standard'
  }
  
  // Get rental duration
  let durationType = checkInRequest?.rental_duration || tenant?.rental_duration || 'daily'
  
  if (checkInRequest?.selected_room_type) {
    try {
      const parsed = typeof checkInRequest.selected_room_type === 'string'
        ? JSON.parse(checkInRequest.selected_room_type)
        : checkInRequest.selected_room_type
      if (parsed?.rental_duration) {
        durationType = parsed.rental_duration
      }
    } catch (e) {}
  }

  let rentalDurationStr = '-'
  if (durationType === 'transit_morning' || durationType === 'transit') {
    rentalDurationStr = 'Sesi Pagi (s/d 12:00 WIB)'
  } else if (durationType === 'weekly') {
    rentalDurationStr = `${checkInRequest?.rental_weeks || tenant?.rental_count || 1} Minggu (Mingguan)`
  } else if (durationType === 'monthly') {
    rentalDurationStr = `${checkInRequest?.rental_months || tenant?.rental_count || 1} Bulan (Bulanan)`
  } else if (durationType === 'daily') {
    rentalDurationStr = `${checkInRequest?.rental_days || tenant?.rental_count || 1} Hari (Harian)`
  } else if (tenant?.rental_duration) {
    rentalDurationStr = tenant.rental_duration
  }

  const durationSubText = durationType === 'transit_morning' || durationType === 'transit'
    ? 'Tarif Sesi Pagi • Wajib Checkout Jam 12:00 Siang'
    : durationType === 'weekly'
    ? 'Tarif Mingguan Rp 500.000 / minggu'
    : durationType === 'monthly'
    ? 'Tarif Bulanan'
    : 'Tarif Flat Rp 100.000 / malam'
  
  // Get NIK
  const nik = checkInRequest?.id_card_number || tenant?.id_card_number || '-'
  
  // Format payment method
  const isDepositClaim = payment.payment_method === 'deposit_deduction' || payment.notes?.includes('[Klaim Deposit]')
  const isCheckoutSettlement = payment.notes?.includes('[Pelunasan Check-Out]')
  
  const paymentMethodMap: Record<string, string> = {
    'cash': 'Tunai di Resepsionis',
    'qris': 'QRIS Pembayaran Digital (GPN)',
    'transfer': 'Transfer Bank / QRIS',
    'deposit_deduction': 'Pemotongan / Klaim Deposit',
    'e-wallet': 'E-Wallet / GoPay / OVO',
    'other': 'Lainnya'
  }
  const isCash = (payment.payment_method || '').toLowerCase().includes('cash') || 
    (payment.payment_method || '').toLowerCase().includes('tunai') ||
    checkInRequest?.payment_destination?.toLowerCase().includes('cash') ||
    checkInRequest?.payment_destination?.toLowerCase().includes('resepsionis') ||
    (payment.notes?.toLowerCase().includes('tunai') && !isDepositClaim)

  let paymentMethodDisplay = 'QRIS Pembayaran Digital (GPN)'
  if (isDepositClaim) {
    paymentMethodDisplay = 'Potongan / Klaim Deposit'
  } else if (isCheckoutSettlement) {
    paymentMethodDisplay = isCash ? 'Pelunasan Tunai di Resepsionis' : 'Pelunasan Transfer Bank / QRIS'
  } else if (isCash) {
    paymentMethodDisplay = 'Tunai di Resepsionis'
  } else if (paymentMethodMap[payment.payment_method]) {
    paymentMethodDisplay = paymentMethodMap[payment.payment_method]
  }
  
  // Format dates
  const paymentDate = new Date(payment.payment_date || payment.created_at)
  const paymentDateStr = paymentDate.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const createdAt = new Date(payment.created_at)
  const createdAtStr = createdAt.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Invoice number format
  const invoiceNumber = `INV-${payment.id.substring(0, 8).toUpperCase()}`
  const amount = parseFloat(payment.amount) || 0

  // Indonesian number to words converter
  const numberToWords = (num: number): string => {
    const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
    const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh']
    
    if (num === 0) return 'nol'
    if (num < 10) return ones[num]
    if (num < 20) {
      if (num === 10) return 'sepuluh'
      if (num === 11) return 'sebelas'
      return ones[num % 10] + ' belas'
    }
    if (num < 100) {
      const rem = num % 10
      return tens[Math.floor(num / 10)] + (rem > 0 ? ' ' + ones[rem] : '')
    }
    if (num < 1000) {
      const rem = num % 100
      const hundreds = Math.floor(num / 100)
      const prefix = hundreds === 1 ? 'seratus' : ones[hundreds] + ' ratus'
      return prefix + (rem > 0 ? ' ' + numberToWords(rem) : '')
    }
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000)
      const rem = num % 1000
      const prefix = thousands === 1 ? 'seribu' : numberToWords(thousands) + ' ribu'
      return prefix + (rem > 0 ? ' ' + numberToWords(rem) : '')
    }
    if (num < 1000000000) {
      const millions = Math.floor(num / 1000000)
      const rem = num % 1000000
      return numberToWords(millions) + ' juta' + (rem > 0 ? ' ' + numberToWords(rem) : '')
    }
    return num.toLocaleString('id-ID')
  }

  const amountInWords = `${numberToWords(amount)} rupiah`
  const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

  // Direct native print handler that works smoothly across all Mobile and Desktop browsers
  const handlePrint = () => {
    window.print()
  }

  // Handle WhatsApp Link
  const phoneNumber = checkInRequest?.phone || tenant?.phone || ''
  const handleWhatsApp = () => {
    if (!phoneNumber) {
      alert('Nomor telepon tamu tidak tersedia')
      return
    }
    
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '')
    const phoneForUrl = formattedPhone.startsWith('0') ? '62' + formattedPhone.substring(1) : formattedPhone

    const invoiceText = `*INVOICE RESMI PEMBAYARAN KOST*
*Graha Aisyah Menteng Management*
Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226

━━━━━━━━━━━━━━━━━━━━━━━━━━
*KODE INVOICE:* ${invoiceNumber}
*TANGGAL:* ${createdAtStr}
*STATUS:* *LUNAS (TERVERIFIKASI)*
━━━━━━━━━━━━━━━━━━━━━━━━━━

*DATA PENYEWA:*
• *Nama:* ${tenantName}
• *Kamar:* Kamar ${roomNumberStr} (${roomTypeStr})
• *Durasi:* ${rentalDurationStr}
${nik !== '-' ? `• *NIK:* ${nik}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*RINCIAN PEMBAYARAN:*
• *Keterangan:* Pembayaran Sewa Graha Aisyah Menteng
• *Metode:* ${paymentMethodDisplay}
• *Tanggal Bayar:* ${paymentDateStr}
${payment.notes ? `• *Catatan:* ${payment.notes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL TERBAYAR:*
*${formattedAmount}*
_(${amountInWords})_
━━━━━━━━━━━━━━━━━━━━━━━━━━

Terima kasih atas pembayaran Anda. Invoice ini merupakan bukti transaksi yang sah dan resmi.

_Graha Aisyah Menteng — Hunian Nyaman, Strategis, & Terpercaya_`

    const whatsappUrl = `https://wa.me/${phoneForUrl}?text=${encodeURIComponent(invoiceText)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Action Bar (No-Print) */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>Pratinjau Kuitansi / Invoice Digital</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>

          {phoneNumber && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document Box */}
      <div
        ref={invoiceRef}
        className="printable-invoice bg-white p-4 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm text-slate-900 font-sans space-y-5 sm:space-y-6"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b-2 border-slate-900 gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-snug">
                INVOICE PEMBAYARAN
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 leading-tight mt-0.5">
                Graha Aisyah Menteng Management • Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>LUNAS / TERVERIFIKASI</span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 font-bold">
              {invoiceNumber}
            </p>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Invoice Information */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200/60 pb-1">
              <span>Informasi Transaksi</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">No. Invoice:</span>
                <span className="font-mono font-bold text-slate-900 text-right">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Tanggal Terbit:</span>
                <span className="font-semibold text-slate-800 text-right">{createdAtStr}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Metode Bayar:</span>
                <span className="font-bold text-indigo-600 text-right">{paymentMethodDisplay}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Tanggal Transaksi:</span>
                <span className="font-semibold text-slate-800 text-right">{paymentDateStr}</span>
              </div>
            </div>
          </div>

          {/* Tenant Information */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200/60 pb-1">
              <span>Diterbitkan Kepada</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Nama Tamu:</span>
                <span className="font-extrabold text-slate-900 text-right">{tenantName}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Kamar:</span>
                <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-right text-[11px] max-w-[180px] truncate">
                  Kamar {roomNumberStr} ({roomTypeStr})
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Durasi Sewa:</span>
                <span className="font-semibold text-slate-800 text-right">{rentalDurationStr}</span>
              </div>
              {nik !== '-' && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 whitespace-nowrap">NIK:</span>
                  <span className="font-mono text-slate-700 text-right">{nik}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table (Smooth Horizontal Swipeable on Mobile) */}
        <div className="rounded-2xl border border-slate-200/90 overflow-x-auto w-full shadow-2xs scrollbar-thin">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Deskripsi Pembayaran</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Durasi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Jumlah (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="bg-white">
                <td className="py-3.5 px-4 min-w-[240px]">
                  <p className="font-extrabold text-slate-900 text-sm">
                    Sewa Kamar {roomNumberStr !== '-' ? `Kamar ${roomNumberStr}` : ''} ({roomTypeStr})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Graha Aisyah Menteng • {durationSubText}
                  </p>
                  {payment.notes && (
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      Catatan: {payment.notes}
                    </p>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                  {rentalDurationStr}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                  {formattedAmount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Card & Terbilang */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Subtotal Tagihan:</span>
              <span className="font-mono font-bold text-slate-800">{formattedAmount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Biaya Layanan & Admin:</span>
              <span className="font-mono font-bold text-emerald-600">Rp 0 (Gratis)</span>
            </div>
            
            <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-slate-900">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">Total Terbayar:</span>
              <span className="text-lg sm:text-2xl font-mono font-black text-indigo-600">
                {formattedAmount}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border-l-4 border-indigo-600 border border-slate-200/80">
            <p className="text-[10px] uppercase font-bold text-slate-400">Terbilang:</p>
            <p className="text-xs font-semibold text-slate-700 italic capitalize mt-0.5 leading-relaxed">
              "{amountInWords}"
            </p>
          </div>
        </div>

        {/* Confirmation & Footer */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-xs text-slate-500">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Transaksi Sah & Terkonfirmasi Sistem</span>
            </div>
            {confirmedBy?.full_name && (
              <p className="text-[11px] text-slate-400">
                Petugas Verifikasi: <strong className="text-slate-700">{confirmedBy.full_name}</strong>
              </p>
            )}
            {payment.confirmed_at && (
              <p className="text-[11px] text-slate-400">
                Waktu Verifikasi: {new Date(payment.confirmed_at).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <p className="font-black text-slate-900 text-xs">Graha Aisyah Menteng</p>
            <p className="text-[10px] text-slate-400">Hunian Nyaman, Strategis, & Aman</p>
          </div>
        </div>
      </div>
    </div>
  )
}
