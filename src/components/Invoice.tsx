'use client'

import { useRef } from 'react'
import { Printer, Send, Building2, CheckCircle2, ShieldCheck, FileText, Sparkles, Calendar, Clock, Shield } from 'lucide-react'

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

  // Photo Attachments (KTP, Selfie, and Payment Proof)
  const ktpPhotoUrl = checkInRequest?.id_card_photo_url || tenant?.id_card_photo_url
  const selfiePhotoUrl = checkInRequest?.selfie_photo_url || tenant?.selfie_photo_url
  const paymentProofUrl = payment?.payment_proof_url || checkInRequest?.payment_proof_url
  const isProofValid = paymentProofUrl && !paymentProofUrl.includes('placehold')
  const hasPhotos = Boolean(ktpPhotoUrl || selfiePhotoUrl || isProofValid)

  // Deposit / Guarantee Details
  const depositAmount = parseFloat(checkInRequest?.deposit_amount || tenant?.deposit_amount || payment?.deposit_amount || 0)
  const guaranteeTypeDisplay = isDepositClaim
    ? 'Klaim Deposit Terpakai'
    : isCheckoutSettlement
    ? 'Rekonsiliasi Selesai'
    : depositAmount > 0
    ? `Uang Tunai / Transfer (Rp ${new Intl.NumberFormat('id-ID').format(depositAmount)})`
    : 'Titip KTP Fisik Asli'

  // Schedule Check-In & Check-Out
  const checkInRawDate = tenant?.check_in_date || checkInRequest?.assigned_at || checkInRequest?.created_at || payment.created_at
  const checkInDateObj = new Date(checkInRawDate)
  const checkInScheduleStr = `${checkInDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${checkInDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`

  let checkOutScheduleStr = '-'
  if (tenant?.payment_due_date) {
    const dueObj = new Date(tenant.payment_due_date)
    checkOutScheduleStr = `${dueObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • 12:00 WIB`
  } else {
    const checkOutDateObj = new Date(checkInDateObj)
    if (durationType === 'transit_morning' || durationType === 'transit') {
      checkOutScheduleStr = `${checkInDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • 12:00 WIB (Siang)`
    } else if (durationType === 'weekly') {
      const weeks = checkInRequest?.rental_weeks || tenant?.rental_count || 1
      checkOutDateObj.setDate(checkOutDateObj.getDate() + (weeks * 7))
      checkOutScheduleStr = `${checkOutDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • 12:00 WIB`
    } else if (durationType === 'monthly') {
      const months = checkInRequest?.rental_months || tenant?.rental_count || 1
      checkOutDateObj.setMonth(checkOutDateObj.getMonth() + months)
      checkOutScheduleStr = `${checkOutDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • 12:00 WIB`
    } else {
      const days = checkInRequest?.rental_days || tenant?.rental_count || 1
      checkOutDateObj.setDate(checkOutDateObj.getDate() + days)
      checkOutScheduleStr = `${checkOutDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • 12:00 WIB`
    }
  }

  // Isolated high-quality print & PDF handler (No modal clipping, no white space gap)
  const handlePrint = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light">
          <title>Invoice - ${invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            @page {
              size: A4 portrait;
              margin: 8mm 8mm 8mm 8mm;
            }

            html, body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              margin: 0;
              padding: 0;
            }

            .invoice-wrapper {
              max-width: 100%;
              margin: 0 auto;
              background: #ffffff;
              padding: 4px;
            }

            .header-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .header-table td {
              vertical-align: top;
            }

            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }

            .brand-subtitle {
              font-size: 10.5px;
              color: #64748b;
              font-weight: 600;
              margin-top: 2px;
              max-width: 480px;
            }

            .status-badge {
              display: inline-block;
              background: #ecfdf5 !important;
              color: #047857 !important;
              border: 1.5px solid #6ee7b7;
              font-size: 9.5px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: right;
            }

            .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              margin-top: 4px;
              text-align: right;
            }

            .info-grid {
              width: 100%;
              border-collapse: separate;
              border-spacing: 10px 0;
              margin-left: -10px;
              margin-right: -10px;
              margin-bottom: 12px;
            }

            .info-card {
              width: 50%;
              background: #f8fafc !important;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 12px;
              vertical-align: top;
            }

            .card-heading {
              font-size: 9.5px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 3px;
            }

            .data-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10.5px;
            }

            .data-label {
              color: #64748b;
            }

            .data-val {
              color: #0f172a;
              font-weight: 700;
              text-align: right;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid #cbd5e1;
            }

            .items-table th {
              background: #0f172a !important;
              color: #ffffff !important;
              font-size: 9.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 7px 10px;
              text-align: left;
            }

            .items-table td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 10.5px;
            }

            .item-title {
              font-weight: 800;
              font-size: 11.5px;
              color: #0f172a;
            }

            .item-sub {
              font-size: 9.5px;
              color: #64748b;
              margin-top: 1.5px;
            }

            .summary-box {
              background: #f8fafc !important;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              padding: 10px 14px;
              margin-bottom: 10px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
              color: #475569;
              margin-bottom: 3px;
            }

            .summary-total {
              border-top: 1.5px dashed #94a3b8;
              padding-top: 6px;
              margin-top: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .total-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0f172a;
            }

            .total-amount {
              font-family: 'JetBrains Mono', monospace;
              font-size: 15px;
              font-weight: 900;
              color: #4f46e5;
            }

            .terbilang-card {
              background: #ffffff !important;
              border-left: 4px solid #4f46e5;
              border: 1px solid #e2e8f0;
              border-left-width: 4px;
              border-radius: 6px;
              padding: 6px 10px;
              margin-bottom: 12px;
            }

            .terbilang-title {
              font-size: 8.5px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
            }

            .terbilang-text {
              font-size: 10.5px;
              font-weight: 700;
              color: #334155;
              font-style: italic;
              text-transform: capitalize;
              margin-top: 1px;
            }

            .footer-table {
              width: 100%;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              font-size: 9.5px;
              color: #64748b;
            }

            .seal-badge {
              color: #047857;
              font-weight: 800;
              margin-bottom: 2px;
            }

            @media print {
              html, body {
                padding: 0 !important;
                margin: 0 !important;
              }
              .invoice-wrapper {
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <!-- Top Header -->
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand-title">INVOICE PEMBAYARAN</div>
                  <div class="brand-subtitle">Graha Aisyah Menteng Management • Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226</div>
                </td>
                <td style="text-align: right;">
                  <div class="status-badge">LUNAS / TERVERIFIKASI</div>
                  <div class="invoice-id">${invoiceNumber}</div>
                </td>
              </tr>
            </table>

            <!-- 2-Column Info Grid -->
            <table class="info-grid">
              <tr>
                <td class="info-card">
                  <div class="card-heading">Informasi Transaksi & Jaminan</div>
                  <div class="data-row">
                    <span class="data-label">No. Invoice:</span>
                    <span class="data-val" style="font-family: monospace;">${invoiceNumber}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Tanggal Terbit:</span>
                    <span class="data-val">${createdAtStr}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Metode Bayar:</span>
                    <span class="data-val" style="color: #4f46e5;">${paymentMethodDisplay}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Tanggal Transaksi:</span>
                    <span class="data-val">${paymentDateStr}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Jenis Jaminan / Deposit:</span>
                    <span class="data-val" style="color: #b45309; font-weight: 800;">${guaranteeTypeDisplay}</span>
                  </div>
                </td>

                <td class="info-card">
                  <div class="card-heading" style="color: #7c3aed;">Diterbitkan Kepada & Jadwal Sewa</div>
                  <div class="data-row">
                    <span class="data-label">Nama Tamu:</span>
                    <span class="data-val">${tenantName}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Kamar:</span>
                    <span class="data-val" style="color: #4f46e5;">Kamar ${roomNumberStr} (${roomTypeStr})</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Durasi Sewa:</span>
                    <span class="data-val">${rentalDurationStr}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Jadwal Check-In:</span>
                    <span class="data-val" style="color: #047857;">${checkInScheduleStr}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">Jadwal Check-Out:</span>
                    <span class="data-val" style="color: #b91c1c;">${checkOutScheduleStr}</span>
                  </div>
                  ${nik !== '-' ? `
                  <div class="data-row">
                    <span class="data-label">NIK:</span>
                    <span class="data-val" style="font-family: monospace;">${nik}</span>
                  </div>` : ''}
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th>Deskripsi Pembayaran</th>
                  <th style="text-align: center; width: 140px;">Durasi</th>
                  <th style="text-align: right; width: 160px;">Jumlah (IDR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="item-title">Sewa Kamar ${roomNumberStr !== '-' ? `Kamar ${roomNumberStr}` : ''} (${roomTypeStr})</div>
                    <div class="item-sub">Graha Aisyah Menteng • ${durationSubText}</div>
                    ${payment.notes ? `<div class="item-sub" style="color: #4f46e5; margin-top: 3px;">Catatan: ${payment.notes}</div>` : ''}
                  </td>
                  <td style="text-align: center; font-weight: 700;">${rentalDurationStr}</td>
                  <td style="text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">${formattedAmount}</td>
                </tr>
              </tbody>
            </table>

            <!-- Total Calculation -->
            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal Tagihan:</span>
                <span style="font-family: monospace; font-weight: 700;">${formattedAmount}</span>
              </div>
              <div class="summary-row">
                <span>Biaya Layanan & Admin:</span>
                <span style="font-family: monospace; font-weight: 700; color: #16a34a;">Rp 0 (Gratis)</span>
              </div>
              <div class="summary-total">
                <span class="total-title">Total Terbayar:</span>
                <span class="total-amount">${formattedAmount}</span>
              </div>
            </div>

            <!-- Terbilang Box -->
            <div class="terbilang-card">
              <div class="terbilang-title">Terbilang:</div>
              <div class="terbilang-text">"${amountInWords}"</div>
            </div>

            ${hasPhotos ? `
            <!-- Lampiran Bukti Identitas & Pembayaran Digital -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; margin-bottom: 12px;">
              <div style="font-size: 9.5px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
                Lampiran Bukti Identitas & Pembayaran Digital (Foto Asli)
              </div>
              <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-left: -8px; margin-right: -8px;">
                <tr>
                  <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase;">FOTO KTP / IDENTITAS</div>
                    ${ktpPhotoUrl ? `
                      <div style="height: 125px; overflow: hidden; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #0f172a;">
                        <img src="${ktpPhotoUrl}" style="max-width: 100%; max-height: 125px; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="height: 125px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 9.5px; color: #94a3b8;">
                        Tidak ada foto
                      </div>
                    `}
                    <div style="font-size: 9px; font-family: monospace; font-weight: 700; color: #334155; margin-top: 5px;">${nik !== '-' ? `NIK: ${nik}` : 'Identitas Tamu'}</div>
                  </td>

                  <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase;">FOTO WAJAH (SELFIE)</div>
                    ${selfiePhotoUrl ? `
                      <div style="height: 125px; overflow: hidden; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #0f172a;">
                        <img src="${selfiePhotoUrl}" style="max-width: 100%; max-height: 125px; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="height: 125px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 9.5px; color: #94a3b8;">
                        Tidak ada foto
                      </div>
                    `}
                    <div style="font-size: 9px; font-family: monospace; font-weight: 700; color: #334155; margin-top: 5px;">${tenantName}</div>
                  </td>

                  <td style="width: 33.33%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase;">BUKTI PEMBAYARAN</div>
                    ${isProofValid ? `
                      <div style="height: 125px; overflow: hidden; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #0f172a;">
                        <img src="${paymentProofUrl}" style="max-width: 100%; max-height: 125px; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="height: 125px; border-radius: 6px; background: #fef3c7; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9.5px; color: #92400e; padding: 6px;">
                        <strong style="font-size: 10.5px;">Tunai di Resepsionis</strong>
                        <span style="font-size: 8.5px; color: #b45309; margin-top: 2px;">Diterima Langsung oleh Kasir</span>
                      </div>
                    `}
                    <div style="font-size: 9px; font-family: monospace; font-weight: 700; color: #334155; margin-top: 5px;">${paymentMethodDisplay}</div>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            <!-- Footer & Verification -->
            <table class="footer-table">
              <tr>
                <td>
                  <div class="seal-badge">Transaksi Sah & Terkonfirmasi Sistem</div>
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

    // Remove existing print iframe if any
    const oldIframe = document.getElementById('app-print-invoice-iframe')
    if (oldIframe) {
      document.body.removeChild(oldIframe)
    }

    // Create a hidden clean iframe
    const iframe = document.createElement('iframe')
    iframe.id = 'app-print-invoice-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document || iframe.contentDocument
    if (!doc) {
      window.print()
      return
    }

    doc.open()
    doc.write(htmlContent)
    doc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.warn('Iframe print fallback to window.print:', e)
        window.print()
      }
    }, 300)
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

*DATA PENYEWA & JADWAL:*
• *Nama:* ${tenantName}
• *Kamar:* Kamar ${roomNumberStr} (${roomTypeStr})
• *Durasi:* ${rentalDurationStr}
• *Jaminan/Deposit:* ${guaranteeTypeDisplay}
• *Jadwal Check-In:* ${checkInScheduleStr}
• *Jadwal Check-Out:* ${checkOutScheduleStr}
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
              <Shield className="w-3 h-3 text-indigo-600" />
              <span>Informasi Transaksi & Jaminan</span>
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
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 whitespace-nowrap">Jaminan / Deposit:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-right text-[11px]">
                  {guaranteeTypeDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Tenant Information */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200/60 pb-1">
              <Calendar className="w-3 h-3 text-purple-600" />
              <span>Diterbitkan Kepada & Jadwal Sewa</span>
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
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Check-In:</span>
                <span className="font-bold text-emerald-700 text-right text-[11px]">{checkInScheduleStr}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 whitespace-nowrap">Check-Out:</span>
                <span className="font-bold text-rose-700 text-right text-[11px]">{checkOutScheduleStr}</span>
              </div>
              {nik !== '-' && (
                <div className="flex justify-between items-center gap-2 pt-0.5 border-t border-slate-200/60">
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

        {/* Lampiran Bukti Identitas & Pembayaran Digital */}
        {hasPhotos && (
          <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Lampiran Bukti Identitas & Pembayaran Digital
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Dokumen Terverifikasi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Foto KTP */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold text-slate-700">Foto KTP / Identitas</span>
                  <span className="text-[9px] font-mono text-slate-400">{nik !== '-' ? 'NIK Valid' : ''}</span>
                </div>
                {ktpPhotoUrl ? (
                  <div className="w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-1">
                    <img 
                      src={ktpPhotoUrl} 
                      alt="KTP" 
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => window.open(ktpPhotoUrl, '_blank')}
                      title="Klik untuk melihat foto ukuran penuh" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-52 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                    <span>Tidak ada foto KTP</span>
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-600 block truncate font-bold">{nik !== '-' ? `NIK: ${nik}` : 'Identitas Tamu'}</span>
              </div>

              {/* Foto Selfie / Wajah */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold text-slate-700">Foto Wajah (Selfie)</span>
                  <span className="text-[9px] text-indigo-600 font-bold">Check-in</span>
                </div>
                {selfiePhotoUrl ? (
                  <div className="w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-1">
                    <img 
                      src={selfiePhotoUrl} 
                      alt="Selfie" 
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => window.open(selfiePhotoUrl, '_blank')}
                      title="Klik untuk melihat foto ukuran penuh" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-52 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                    <span>Tidak ada foto selfie</span>
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-600 block truncate font-bold">{tenantName}</span>
              </div>

              {/* Bukti Bayar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold text-slate-700">Bukti Pembayaran</span>
                  <span className="text-[9px] text-emerald-600 font-bold">{isCash ? 'Tunai' : 'Digital'}</span>
                </div>
                {isProofValid ? (
                  <div className="w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-1">
                    <img 
                      src={paymentProofUrl} 
                      alt="Bukti Bayar" 
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => window.open(paymentProofUrl, '_blank')}
                      title="Klik untuk melihat foto ukuran penuh" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-52 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col items-center justify-center text-xs text-amber-800 p-3 space-y-1">
                    <ShieldCheck className="w-8 h-8 text-amber-600 mb-1" />
                    <strong className="text-sm">Tunai di Resepsionis</strong>
                    <span className="text-[10px] text-amber-700 text-center">Diterima & diverifikasi langsung oleh petugas kasir</span>
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-600 block truncate font-bold">{paymentMethodDisplay}</span>
              </div>
            </div>
          </div>
        )}

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
