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
  let rentalDurationStr = '-'
  if (checkInRequest?.rental_duration === 'daily') {
    rentalDurationStr = `${checkInRequest.rental_days || 1} Hari (Harian)`
  } else if (checkInRequest?.rental_duration === 'weekly') {
    rentalDurationStr = `${checkInRequest.rental_weeks || 1} Minggu (Mingguan)`
  } else if (checkInRequest?.rental_duration === 'monthly') {
    rentalDurationStr = `${checkInRequest.rental_months || 1} Bulan (Bulanan)`
  } else if (tenant?.rental_duration) {
    rentalDurationStr = tenant.rental_duration
  }
  
  // Get NIK
  const nik = checkInRequest?.id_card_number || tenant?.id_card_number || '-'
  
  // Format payment method
  const paymentMethodMap: Record<string, string> = {
    'cash': 'Tunai di Resepsionis',
    'qris': 'QRIS GoPay Merchant',
    'transfer': 'Transfer Bank / QRIS',
    'deposit_deduction': 'Pemotongan Deposit',
    'e-wallet': 'GoPay / E-Wallet',
    'other': 'Lainnya'
  }
  const paymentMethodDisplay = paymentMethodMap[payment.payment_method] || payment.payment_method || 'QRIS GoPay'
  
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

  // PRINT FUNCTION WITH SELF-CONTAINED HIGH-QUALITY PDF / PRINT LAYOUT
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Kuitansi Invoice - ${invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }

            body {
              font-family: 'Plus Jakarta Sans', Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }

            .invoice-box {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px;
              background: #ffffff;
            }

            /* Header */
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }

            .header-table td {
              vertical-align: top;
            }

            .brand-title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }

            .brand-subtitle {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
              margin-top: 2px;
            }

            .status-badge {
              display: inline-block;
              background: #dcfce7 !important;
              color: #15803d !important;
              border: 1.5px solid #86efac;
              font-size: 11px;
              font-weight: 800;
              padding: 5px 14px;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: right;
            }

            .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              margin-top: 6px;
              text-align: right;
            }

            /* 2 Columns Cards */
            .info-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 14px 0;
              margin-left: -14px;
              margin-right: -14px;
              margin-bottom: 24px;
            }

            .info-card {
              width: 50%;
              background: #f8fafc !important;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              vertical-align: top;
            }

            .card-label {
              font-size: 10px;
              font-weight: 800;
              color: #6366f1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
            }

            .card-row {
              width: 100%;
              margin-bottom: 6px;
            }

            .card-row-label {
              color: #64748b;
              font-size: 11px;
              width: 40%;
              display: inline-block;
            }

            .card-row-val {
              color: #0f172a;
              font-weight: 700;
              font-size: 12px;
              width: 58%;
              display: inline-block;
            }

            /* Items Table */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border-radius: 10px;
              overflow: hidden;
              border: 1px solid #cbd5e1;
            }

            .items-table th {
              background: #0f172a !important;
              color: #ffffff !important;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 10px 14px;
              text-align: left;
            }

            .items-table th.text-right {
              text-align: right;
            }

            .items-table th.text-center {
              text-align: center;
            }

            .items-table td {
              padding: 14px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }

            .item-title {
              font-weight: 800;
              font-size: 13px;
              color: #0f172a;
            }

            .item-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }

            /* Total Breakdown */
            .total-table {
              width: 100%;
              border-collapse: collapse;
              background: #f8fafc !important;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              margin-bottom: 18px;
            }

            .total-table td {
              padding: 10px 16px;
              font-size: 12px;
            }

            .total-final {
              border-top: 1.5px dashed #94a3b8;
              font-size: 16px !important;
              font-weight: 800;
              color: #4f46e5;
              padding-top: 14px !important;
              padding-bottom: 14px !important;
            }

            .terbilang-card {
              background: #ffffff !important;
              border-left: 4px solid #4f46e5;
              border: 1px solid #e2e8f0;
              border-left-width: 4px;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 24px;
            }

            .terbilang-title {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
            }

            .terbilang-text {
              font-size: 12px;
              font-weight: 700;
              color: #334155;
              font-style: italic;
              text-transform: capitalize;
              margin-top: 2px;
            }

            /* Footer */
            .footer-table {
              width: 100%;
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
            }

            .footer-table td {
              vertical-align: top;
              font-size: 11px;
              color: #64748b;
            }

            .seal-badge {
              color: #15803d;
              font-weight: 700;
              margin-bottom: 2px;
            }

            @media print {
              body {
                padding: 0;
                background: #ffffff;
              }
              .invoice-box {
                border: none;
                padding: 0;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand-title">INVOICE PEMBAYARAN</div>
                  <div class="brand-subtitle">Graha Aisyah Menteng Management • Jl. Menteng No. 1, Jakarta Pusat</div>
                </td>
                <td style="text-align: right;">
                  <div class="status-badge">✓ LUNAS / TERVERIFIKASI</div>
                  <div class="invoice-id">${invoiceNumber}</div>
                </td>
              </tr>
            </table>

            <!-- 2 Columns Info Cards -->
            <table class="info-table">
              <tr>
                <td class="info-card">
                  <div class="card-label">Informasi Transaksi</div>
                  <div class="card-row">
                    <span class="card-row-label">No. Invoice:</span>
                    <span class="card-row-val" style="font-family: monospace;">${invoiceNumber}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-row-label">Tgl Terbit:</span>
                    <span class="card-row-val">${createdAtStr}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-row-label">Metode Bayar:</span>
                    <span class="card-row-val" style="color: #4f46e5;">${paymentMethodDisplay}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-row-label">Tgl Transaksi:</span>
                    <span class="card-row-val">${paymentDateStr}</span>
                  </div>
                </td>
                <td class="info-card">
                  <div class="card-label" style="color: #9333ea;">Diterbitkan Kepada</div>
                  <div class="card-row">
                    <span class="card-row-label">Nama Tamu:</span>
                    <span class="card-row-val">${tenantName}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-row-label">Kamar:</span>
                    <span class="card-row-val" style="color: #4f46e5;">Kamar ${roomNumberStr} (${roomTypeStr})</span>
                  </div>
                  <div class="card-row">
                    <span class="card-row-label">Durasi Sewa:</span>
                    <span class="card-row-val">${rentalDurationStr}</span>
                  </div>
                  ${nik !== '-' ? `
                  <div class="card-row">
                    <span class="card-row-label">NIK:</span>
                    <span class="card-row-val" style="font-family: monospace;">${nik}</span>
                  </div>` : ''}
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th>Deskripsi Pembayaran</th>
                  <th class="text-center" style="width: 140px;">Durasi</th>
                  <th class="text-right" style="width: 160px;">Jumlah (IDR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="item-title">Sewa Kamar ${roomNumberStr !== '-' ? `Kamar ${roomNumberStr}` : ''} (${roomTypeStr})</div>
                    <div class="item-sub">Graha Aisyah Menteng • Tarif Flat Rp 100.000 / malam</div>
                    ${payment.notes ? `<div class="item-sub" style="color: #4f46e5; margin-top: 4px;">Catatan: ${payment.notes}</div>` : ''}
                  </td>
                  <td style="text-align: center; font-weight: 700;">${rentalDurationStr}</td>
                  <td style="text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">${formattedAmount}</td>
                </tr>
              </tbody>
            </table>

            <!-- Total Calculation -->
            <table class="total-table">
              <tr>
                <td style="color: #64748b;">Subtotal Tagihan:</td>
                <td style="text-align: right; font-weight: 700; font-family: monospace;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Biaya Admin & Layanan:</td>
                <td style="text-align: right; font-weight: 700; color: #16a34a; font-family: monospace;">Rp 0 (Gratis)</td>
              </tr>
              <tr class="total-final">
                <td style="font-size: 14px; text-transform: uppercase; font-weight: 800;">Total Terbayar:</td>
                <td style="text-align: right; font-size: 18px; font-weight: 900; font-family: monospace; color: #4f46e5;">${formattedAmount}</td>
              </tr>
            </table>

            <!-- Terbilang Box -->
            <div class="terbilang-card">
              <div class="terbilang-title">Terbilang:</div>
              <div class="terbilang-text">"${amountInWords}"</div>
            </div>

            <!-- Footer & Signatures -->
            <table class="footer-table">
              <tr>
                <td>
                  <div class="seal-badge">✓ Transaksi Sah & Terkonfirmasi Sistem</div>
                  ${confirmedBy?.full_name ? `<div>Petugas Verifikasi: <strong>${confirmedBy.full_name}</strong></div>` : ''}
                  ${payment.confirmed_at ? `<div>Waktu Verifikasi: ${new Date(payment.confirmed_at).toLocaleString('id-ID')}</div>` : ''}
                </td>
                <td style="text-align: right;">
                  <div style="font-weight: 800; color: #0f172a;">Graha Aisyah Menteng</div>
                  <div>Hunian Nyaman, Strategis, & Aman</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
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
Jl. Menteng No. 1, Jakarta Pusat

━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *KODE INVOICE:* ${invoiceNumber}
📅 *TANGGAL:* ${createdAtStr}
🏷️ *STATUS:* *LUNAS (TERVERIFIKASI)*
━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *DATA PENYEWA:*
• *Nama:* ${tenantName}
• *Kamar:* Kamar ${roomNumberStr} (${roomTypeStr})
• *Durasi:* ${rentalDurationStr}
${nik !== '-' ? `• *NIK:* ${nik}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 *RINCIAN PEMBAYARAN:*
• *Keterangan:* Pembayaran Sewa Graha Aisyah Menteng
• *Metode:* ${paymentMethodDisplay}
• *Tanggal Bayar:* ${paymentDateStr}
${payment.notes ? `• *Catatan:* ${payment.notes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL TERBAYAR:*
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
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-900/5 p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Pratinjau Kuitansi / Invoice Digital</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>

          {phoneNumber && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document Box */}
      <div
        ref={invoiceRef}
        className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm text-slate-900 font-sans space-y-6"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                INVOICE PEMBAYARAN
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Graha Aisyah Menteng Management • Jl. Menteng No. 1, Jakarta Pusat
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-black tracking-wider uppercase shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>LUNAS / TERVERIFIKASI</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1 font-semibold">
              {invoiceNumber}
            </p>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Invoice Information */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Informasi Transaksi</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Invoice:</span>
                <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Terbit:</span>
                <span className="font-semibold text-slate-800">{createdAtStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode Bayar:</span>
                <span className="font-bold text-indigo-600">{paymentMethodDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Transaksi:</span>
                <span className="font-semibold text-slate-800">{paymentDateStr}</span>
              </div>
            </div>
          </div>

          {/* Tenant Information */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Diterbitkan Kepada</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Tamu:</span>
                <span className="font-extrabold text-slate-900">{tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kamar:</span>
                <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Kamar {roomNumberStr} ({roomTypeStr})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Durasi Sewa:</span>
                <span className="font-semibold text-slate-800">{rentalDurationStr}</span>
              </div>
              {nik !== '-' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">NIK:</span>
                  <span className="font-mono text-slate-700">{nik}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="rounded-2xl border border-slate-200/90 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4">Deskripsi Pembayaran</th>
                <th className="py-3 px-4 text-center">Durasi</th>
                <th className="py-3 px-4 text-right">Jumlah (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="bg-white">
                <td className="py-3.5 px-4">
                  <p className="font-extrabold text-slate-900 text-sm">
                    Sewa Kamar {roomNumberStr !== '-' ? `Kamar ${roomNumberStr}` : ''} ({roomTypeStr})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Graha Aisyah Menteng • Tarif Flat Rp 100.000 / malam
                  </p>
                  {payment.notes && (
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      Catatan: {payment.notes}
                    </p>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                  {rentalDurationStr}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                  {formattedAmount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Card & Terbilang */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Subtotal Tagihan:</span>
              <span className="font-mono font-bold text-slate-800">{formattedAmount}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Biaya Layanan & Admin:</span>
              <span className="font-mono font-bold text-emerald-600">Rp 0 (Gratis)</span>
            </div>
            
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900">
              <span className="text-sm font-extrabold uppercase tracking-wide">Total Terbayar:</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-indigo-600">
                {formattedAmount}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border-l-4 border-indigo-600 border border-slate-200/80">
            <p className="text-[10px] uppercase font-bold text-slate-400">Terbilang:</p>
            <p className="text-xs font-semibold text-slate-700 italic capitalize mt-0.5">
              "{amountInWords}"
            </p>
          </div>
        </div>

        {/* Confirmation & Footer */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-500">
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
