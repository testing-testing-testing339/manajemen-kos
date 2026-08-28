'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, Building2, Sparkles, CheckCircle2 } from 'lucide-react'

export default function QRGenerator({ branches, userRole }: { branches: any[], userRole: string | null }) {
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || 'default')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const generateCheckInQR = async (branchId: string) => {
    setLoading(true)
    try {
      const siteUrl = window.location.origin
      const checkInUrl = `${siteUrl}/check-in`
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrDataUrl)

      // Save to database
      if (branchId && branchId !== 'default') {
        await fetch('/api/branch/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch_id: branchId,
            qr_code_data: checkInUrl
          }),
        }).catch(() => {})
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto generate QR code on mount
  useEffect(() => {
    generateCheckInQR(selectedBranch)
  }, [selectedBranch])

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.download = `qr-code-checkin-graha-aisyah-menteng.png`
    link.href = qrCodeUrl
    link.click()
  }

  const selectedBranchData = branches.find(b => b.name?.toLowerCase().includes('menteng')) || {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Graha Aisyah Menteng',
    address: 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          QR Code Check-in Tamu
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Generate dan unduh QR code formulir check-in mandiri untuk Graha Aisyah Menteng
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Info & Settings Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{selectedBranchData.name || 'Graha Aisyah Menteng'}</h2>
              <p className="text-xs text-slate-400">{selectedBranchData.address || 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Kemudahan Registrasi Mandiri Tamu:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
              <li>Tamu cukup scan QR ini dengan kamera HP / Google Lens.</li>
              <li>Pilih tipe kamar (13 VIP / 40 Non-VIP) & durasi sewa.</li>
              <li>Unggah foto KTP dengan panduan frame otomatis.</li>
              <li>Pembayaran instan via QRIS GoPay Merchant atau Cash di resepsionis.</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={() => generateCheckInQR(selectedBranch)}
              disabled={loading}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Perbarui / Generate Ulang QR Code</span>
            </button>
          </div>
        </div>

        {/* QR Preview Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-3xl shadow-xl">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code Checkin Graha Aisyah Menteng" className="w-64 h-64 mx-auto" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Membuat QR Code...
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800">
              Scan untuk Check-in di Graha Aisyah Menteng
            </p>
            <p className="text-[11px] text-slate-400">
              URL: <span className="font-mono text-indigo-600">/check-in</span>
            </p>
          </div>

          <button
            onClick={downloadQR}
            disabled={!qrCodeUrl}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR Code (.PNG)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
