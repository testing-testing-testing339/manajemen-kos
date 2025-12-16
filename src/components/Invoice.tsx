'use client'

import { useRef } from 'react'

interface InvoiceProps {
  payment: any
  tenant?: any
  checkInRequest?: any
  confirmedBy?: any
}

export default function Invoice({ payment, tenant, checkInRequest, confirmedBy }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Get tenant name
  const tenantName = tenant?.full_name || checkInRequest?.full_name || 'Unknown'
  
  // Get room info
  let roomInfo = '-'
  let branchName = '-'
  if (tenant?.rooms) {
    roomInfo = `No. ${tenant.rooms.room_number}`
    branchName = tenant.rooms.floors?.branches?.name || '-'
  } else if (checkInRequest?.rooms) {
    roomInfo = `No. ${checkInRequest.rooms.room_number}`
    branchName = checkInRequest.rooms.floors?.branches?.name || '-'
  }
  
  // Get rental duration
  let rentalDurationStr = '-'
  if (checkInRequest?.rental_duration === 'daily' && checkInRequest?.rental_days) {
    rentalDurationStr = `Sewa Harian (${checkInRequest.rental_days} hari)`
  } else if (checkInRequest?.rental_duration === 'monthly' || checkInRequest?.rental_duration === '6months') {
    rentalDurationStr = 'Sewa Bulanan (6 bulan)'
  }
  
  // Get NIK
  const nik = checkInRequest?.id_card_number || tenant?.id_card_number || '-'
  
  // Format payment method
  const paymentMethodMap: Record<string, string> = {
    'cash': 'Tunai',
    'transfer': 'Transfer Bank',
    'e-wallet': 'E-Wallet',
    'other': 'Lainnya'
  }
  const paymentMethodDisplay = paymentMethodMap[payment.payment_method] || payment.payment_method
  
  // Format dates
  const paymentDate = new Date(payment.payment_date)
  const paymentDateStr = paymentDate.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const createdAt = new Date(payment.created_at)
  const createdAtStr = createdAt.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Invoice number format: INV-YYYYMMDD-XXX
  const invoiceNumber = `INV-${payment.id.substring(0, 8).toUpperCase()}`

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice Pembayaran - ${invoiceNumber}</title>
              <style>
                * { 
                  margin: 0; 
                  padding: 0; 
                  box-sizing: border-box; 
                }
                @page {
                  size: A4;
                  margin: 1.5cm;
                }
                body { 
                  font-family: 'Arial', 'Helvetica', sans-serif; 
                  padding: 0; 
                  margin: 0;
                  background: white;
                  color: #333;
                  font-size: 12pt;
                  line-height: 1.5;
                }
                .invoice-container {
                  max-width: 100%;
                  margin: 0 auto;
                  background: white;
                  padding: 0;
                }
                .header {
                  border-bottom: 3px solid #4f46e5;
                  padding-bottom: 15px;
                  margin-bottom: 25px;
                  page-break-inside: avoid;
                }
                .header h1 {
                  color: #4f46e5;
                  font-size: 24pt;
                  margin-bottom: 5px;
                  font-weight: bold;
                }
                .header p {
                  color: #666;
                  font-size: 11pt;
                }
                .invoice-info {
                  display: table;
                  width: 100%;
                  margin-bottom: 25px;
                  page-break-inside: avoid;
                }
                .invoice-info > div {
                  display: table-cell;
                  width: 50%;
                  vertical-align: top;
                  padding-right: 20px;
                }
                .invoice-info > div:last-child {
                  padding-right: 0;
                  padding-left: 20px;
                }
                .info-section h3 {
                  color: #333;
                  font-size: 13pt;
                  margin-bottom: 8px;
                  border-bottom: 1px solid #e0e0e0;
                  padding-bottom: 4px;
                  font-weight: bold;
                }
                .info-section p {
                  color: #666;
                  font-size: 11pt;
                  margin: 4px 0;
                  line-height: 1.6;
                  page-break-inside: avoid;
                }
                .details-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  page-break-inside: avoid;
                }
                .details-table th {
                  background: #f5f5f5;
                  padding: 10px;
                  text-align: left;
                  font-weight: bold;
                  border: 1px solid #ddd;
                  font-size: 11pt;
                }
                .details-table td {
                  padding: 10px;
                  border: 1px solid #ddd;
                  font-size: 11pt;
                  vertical-align: top;
                }
                .total-section {
                  margin-top: 30px;
                  padding: 20px;
                  background: #f9fafb;
                  border: 2px solid #4f46e5;
                  border-radius: 8px;
                  page-break-inside: avoid;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 8px 0;
                  font-size: 13pt;
                }
                .total-row.subtotal {
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 12px;
                  margin-bottom: 12px;
                }
                .total-row span:first-child {
                  font-weight: 600;
                  color: #374151;
                }
                .total-row span:last-child {
                  font-weight: 600;
                  color: #374151;
                }
                .total-row.final {
                  font-size: 20pt;
                  font-weight: bold;
                  color: #4f46e5;
                  padding: 12px 0;
                  border-top: 2px solid #4f46e5;
                  margin-top: 12px;
                }
                .total-row.final span:first-child {
                  color: #4f46e5;
                  font-size: 18pt;
                }
                .total-row.final span:last-child {
                  color: #4f46e5;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 15px;
                  border-top: 1px solid #e0e0e0;
                  text-align: center;
                  color: #666;
                  font-size: 10pt;
                  page-break-inside: avoid;
                }
                .amount-words {
                  margin-top: 15px;
                  padding: 15px;
                  background: white;
                  border: 1px solid #e5e7eb;
                  border-left: 4px solid #4f46e5;
                  border-radius: 6px;
                  font-style: italic;
                  color: #4b5563;
                  font-size: 11pt;
                  page-break-inside: avoid;
                }
                .amount-words .label {
                  font-weight: 600;
                  font-style: normal;
                  color: #374151;
                }
                .payment-info-section {
                  page-break-inside: avoid;
                }
                .payment-info-grid {
                  display: table;
                  width: 100%;
                  margin-top: 20px;
                }
                .payment-info-grid > div {
                  display: table-cell;
                  width: 50%;
                  vertical-align: top;
                  padding-right: 20px;
                }
                .payment-info-grid > div:last-child {
                  padding-right: 0;
                  padding-left: 20px;
                }
                .details-table .payment-details {
                  font-size: 11pt;
                }
                .details-table .payment-details p {
                  margin: 3px 0;
                  line-height: 1.5;
                }
                @media print {
                  body { 
                    padding: 0; 
                    margin: 0;
                  }
                  .invoice-container { 
                    border: none; 
                    padding: 0;
                    margin: 0;
                  }
                  .no-print { 
                    display: none !important; 
                  }
                  .header {
                    page-break-after: avoid;
                  }
                  .total-section {
                    page-break-before: avoid;
                  }
                  .footer {
                    page-break-before: avoid;
                  }
                }
              </style>
            </head>
            <body>
              ${invoiceRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  // Convert number to words (Indonesian)
  const numberToWords = (num: number): string => {
    const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
    const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh']
    const scales = ['', 'ribu', 'juta', 'milyar']
    
    if (num === 0) return 'nol'
    if (num < 10) return ones[num]
    if (num < 20) {
      if (num === 11) return 'sebelas'
      return num === 10 ? 'sepuluh' : ones[num % 10] + ' belas'
    }
    if (num < 100) {
      const remainder = num % 10
      return tens[Math.floor(num / 10)] + (remainder > 0 ? ' ' + ones[remainder] : '')
    }
    if (num < 1000) {
      const remainder = num % 100
      const hundreds = Math.floor(num / 100)
      let result = ''
      if (hundreds === 1) {
        result = 'seratus'
      } else {
        result = ones[hundreds] + ' ratus'
      }
      if (remainder > 0) {
        result += ' ' + numberToWords(remainder)
      }
      return result
    }
    // Simplified version for larger numbers
    return num.toLocaleString('id-ID')
  }

  const amount = parseFloat(payment.amount)
  const amountInWords = numberToWords(Math.floor(amount / 1000)) + ' ribu rupiah'

  // Get phone number from tenant or check-in request
  const phoneNumber = checkInRequest?.phone || tenant?.phone || ''
  
  // Function to format Indonesian phone number to +62 format
  const formatPhoneToWhatsApp = (phone: string): string => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/[^0-9]/g, '')
    
    // If empty, return as is
    if (!digitsOnly) return phone
    
    // If starts with 0, replace with +62
    if (digitsOnly.startsWith('0')) {
      return '+62' + digitsOnly.substring(1)
    }
    
    // If starts with 62, add +
    if (digitsOnly.startsWith('62')) {
      return '+' + digitsOnly
    }
    
    // If already starts with +62, return as is (shouldn't happen after replace, but just in case)
    if (phone.startsWith('+62')) {
      return phone.replace(/[^0-9+]/g, '').replace(/^\+/, '+').replace(/^62/, '+62')
    }
    
    // Default: assume it's Indonesian number starting with 0
    // Add +62 prefix
    return '+62' + digitsOnly
  }
  
  const handleWhatsApp = () => {
    if (!phoneNumber) {
      alert('Nomor telepon tidak tersedia')
      return
    }
    
    // Format phone number to +62 format
    const formattedPhone = formatPhoneToWhatsApp(phoneNumber)
    
    // Create invoice summary text with better formatting
    const invoiceText = `🧾 *INVOICE PEMBAYARAN*
🏢 Graha Aisyah Mainframe System

═══════════════════════
📋 *INFORMASI INVOICE*
═══════════════════════
📄 No. Invoice:
   ${invoiceNumber}

📅 Tanggal Invoice:
   ${createdAtStr}

✅ Status: *LUNAS*

═══════════════════════
👤 *DATA PENYEWA*
═══════════════════════
👨‍💼 Nama:
   ${tenantName}

🏠 Kamar:
   ${roomInfo}

📍 Cabang:
   ${branchName}
${nik !== '-' ? `\n🆔 NIK:\n   ${nik}` : ''}

═══════════════════════
💰 *DETAIL PEMBAYARAN*
═══════════════════════
📝 Keterangan:
   Pembayaran Sewa

📆 Periode:
   ${paymentDateStr}
${rentalDurationStr !== '-' ? `\n⏱️ Durasi:\n   ${rentalDurationStr}` : ''}

💳 Metode:
   ${paymentMethodDisplay}
${payment.notes ? `\n📌 Catatan:\n   ${payment.notes}` : ''}

═══════════════════════
💵 *TOTAL PEMBAYARAN*
═══════════════════════
💸 *${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}*

📝 Terbilang:
   ${amountInWords}

═══════════════════════
📅 *KONFIRMASI*
═══════════════════════
📆 Tanggal Pembayaran:
   ${paymentDateStr}

💳 Metode:
   ${paymentMethodDisplay}
${confirmedBy ? `\n👤 Dikonfirmasi Oleh:\n   ${confirmedBy.full_name || '-'}` : ''}

═══════════════════════

🙏 Terima kasih atas kepercayaan Anda menggunakan layanan Graha Aisyah.

📜 *Invoice ini adalah bukti pembayaran yang sah*`

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(invoiceText)
    // Remove + sign from phone for URL (WhatsApp API expects digits only)
    const phoneForUrl = formattedPhone.replace(/[^0-9]/g, '')
    const whatsappUrl = `https://wa.me/${phoneForUrl}?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
  }

  return (
    <>
      <div className="no-print mb-4 flex gap-3">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak Invoice
        </button>
        {phoneNumber && (
          <button
            onClick={handleWhatsApp}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Kirim via WhatsApp
          </button>
        )}
      </div>

      <div ref={invoiceRef} className="invoice-container bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="header border-b-4 border-indigo-600 pb-6 mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">INVOICE PEMBAYARAN</h1>
          <p className="text-gray-600">Graha Aisyah Mainframe System</p>
        </div>

        {/* Invoice Info */}
        <div className="invoice-info grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="info-section">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Informasi Invoice</h3>
            <p className="text-gray-600 mb-2"><span className="font-semibold">No. Invoice:</span> {invoiceNumber}</p>
            <p className="text-gray-600 mb-2"><span className="font-semibold">Tanggal Invoice:</span> {createdAtStr}</p>
            <p className="text-gray-600"><span className="font-semibold">Status:</span> <span className="text-green-600 font-bold">LUNAS</span></p>
          </div>
          <div className="info-section">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Kepada</h3>
            <p className="text-gray-600 mb-2"><span className="font-semibold">Nama:</span> {tenantName}</p>
            <p className="text-gray-600 mb-2"><span className="font-semibold">Kamar:</span> {roomInfo}</p>
            <p className="text-gray-600 mb-2"><span className="font-semibold">Cabang:</span> {branchName}</p>
            {nik !== '-' && <p className="text-gray-600"><span className="font-semibold">NIK:</span> {nik}</p>}
          </div>
        </div>

        {/* Payment Details Table */}
        <table className="details-table w-full border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-bold text-gray-900">Keterangan</th>
              <th className="border border-gray-300 p-3 text-right font-bold text-gray-900">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-3">
                <div className="payment-details">
                  <p className="font-semibold text-gray-900">Pembayaran Sewa</p>
                  <p className="text-sm text-gray-600 mt-1">Periode: {paymentDateStr}</p>
                  {rentalDurationStr !== '-' && (
                    <p className="text-sm text-gray-600">Durasi: {rentalDurationStr}</p>
                  )}
                  <p className="text-sm text-gray-600">Metode: {paymentMethodDisplay}</p>
                  {payment.notes && (
                    <p className="text-sm text-gray-600 mt-1">Catatan: {payment.notes}</p>
                  )}
                </div>
              </td>
              <td className="border border-gray-300 p-3 text-right font-semibold text-gray-900">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total Section */}
        <div className="total-section mt-8">
          <div className="total-row subtotal">
            <span>Subtotal</span>
            <span>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
            </span>
          </div>
          <div className="total-row final">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
            </span>
          </div>
          <div className="amount-words">
            <span className="label">Terbilang:</span> {amountInWords}
          </div>
        </div>

        {/* Payment Information */}
        <div className="mt-8 pt-6 border-t border-gray-200 payment-info-section">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Informasi Pembayaran</h3>
          <div className="payment-info-grid text-gray-600">
            <div>
              <p className="mb-2"><span className="font-semibold">Tanggal Pembayaran:</span> {paymentDateStr}</p>
              <p className="mb-2"><span className="font-semibold">Metode Pembayaran:</span> {paymentMethodDisplay}</p>
            </div>
            <div>
              {confirmedBy && (
                <p className="mb-2"><span className="font-semibold">Dikonfirmasi Oleh:</span> {confirmedBy.full_name || '-'}</p>
              )}
              {payment.confirmed_at && (
                <p className="mb-2">
                  <span className="font-semibold">Waktu Konfirmasi:</span>{' '}
                  {new Date(payment.confirmed_at).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer mt-12 pt-6 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>Terima kasih atas kepercayaan Anda menggunakan layanan Graha Aisyah</p>
          <p className="mt-2">Invoice ini adalah bukti pembayaran yang sah</p>
        </div>
      </div>
    </>
  )
}

