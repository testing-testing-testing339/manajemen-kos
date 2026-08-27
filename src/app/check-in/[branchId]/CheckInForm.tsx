'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  validateFullName, 
  validatePhone, 
  validateEmail, 
  validateIdCardNumber,
  validateFile,
  sanitizeString
} from '@/lib/validation'
import { 
  CreditCard, 
  Camera, 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building, 
  BedDouble, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Upload, 
  Banknote, 
  QrCode, 
  Check, 
  Tv, 
  Wifi, 
  WifiOff,
  Wind, 
  Bath, 
  HelpCircle,
  RotateCcw,
  Crown,
  Receipt,
  FileText,
  Car,
  Info,
  Zap
} from 'lucide-react'

interface CheckInFormProps {
  branchId: string
  branchName: string
}

type RoomCategory = 'vip' | 'non_vip'
type DurationType = 'daily' | 'weekly' | 'monthly'
type MonthlyPackage = 'ac' | 'non_ac'
type PaymentMethod = 'qris' | 'cash'
type GuaranteeType = 'deposit' | 'ktp'

export default function CheckInForm({ branchId, branchName }: CheckInFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_card_number: '',
    id_card_photo: null as File | null,
    selfie_photo: null as File | null,
    terms_accepted: false,
    payment_proof: null as File | null,
  })

  // Guarantee Selection (Deposit Rp 100k or Titip KTP Asli)
  const [guaranteeType, setGuaranteeType] = useState<GuaranteeType>('deposit')

  // Room & Duration selections
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('vip')
  const [durationType, setDurationType] = useState<DurationType>('daily')
  const [dailyDays, setDailyDays] = useState<number>(1)
  const [weeklyWeeks, setWeeklyWeeks] = useState<number>(1)
  const [monthlyMonths, setMonthlyMonths] = useState<number>(1)
  const [monthlyPackage, setMonthlyPackage] = useState<MonthlyPackage>('ac')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')

  // Pricing Constants (Ketentuan Graha Aisyah Menteng)
  const BASE_PRICE_PER_DAY = 100000 // Rp 100.000 / malam (Tarif Flat)
  const BASE_PRICE_PER_WEEK = 500000 // Rp 500.000 / minggu
  const BASE_PRICE_PER_MONTH_AC = 1350000 // Rp 1.350.000 / bulan (Kamar AC / Berfasilitas)
  const BASE_PRICE_PER_MONTH_NON_AC = 650000 // Rp 650.000 / bulan (Kamar Non-AC / Non-Fasilitas)
  const DEPOSIT_AMOUNT = guaranteeType === 'deposit' ? 100000 : 0 // Rp 100k if deposit option, Rp 0 if KTP guarantee option

  // Calculated Totals
  const rentSubtotal = 
    durationType === 'daily' ? BASE_PRICE_PER_DAY * dailyDays :
    durationType === 'weekly' ? BASE_PRICE_PER_WEEK * weeklyWeeks :
    (monthlyPackage === 'non_ac' ? BASE_PRICE_PER_MONTH_NON_AC : BASE_PRICE_PER_MONTH_AC) * monthlyMonths

  const totalAmount = rentSubtotal + DEPOSIT_AMOUNT

  // UI States
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState<'id_card' | 'selfie' | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  const idCardVideoRef = useRef<HTMLVideoElement>(null)
  const selfieVideoRef = useRef<HTMLVideoElement>(null)
  const idCardStreamRef = useRef<MediaStream | null>(null)
  const selfieStreamRef = useRef<MediaStream | null>(null)

  // Camera Management
  const startCamera = async (type: 'id_card' | 'selfie') => {
    if (cameraLoading) return
    try {
      setCameraLoading(true)
      setError('')

      // Check browser support
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser Anda atau halaman tidak diakses via HTTPS/localhost. Silakan gunakan tombol "Upload Dari Galeri / Kamera HP".')
      }

      // Stop any existing stream
      if (idCardStreamRef.current) {
        idCardStreamRef.current.getTracks().forEach(t => t.stop())
        idCardStreamRef.current = null
      }
      if (selfieStreamRef.current) {
        selfieStreamRef.current.getTracks().forEach(t => t.stop())
        selfieStreamRef.current = null
      }

      let stream: MediaStream | null = null

      // Try with facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: type === 'id_card' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
      } catch (errFacing) {
        console.warn('Fallback to basic video getUserMedia:', errFacing)
        // Fallback without strict constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }

      if (stream) {
        const targetStreamRef = type === 'id_card' ? idCardStreamRef : selfieStreamRef
        targetStreamRef.current = stream
        setCameraActive(type)

        // Give React a tick to render video element, then attach stream
        setTimeout(async () => {
          const targetVideo = type === 'id_card' ? idCardVideoRef.current : selfieVideoRef.current
          if (targetVideo && stream) {
            targetVideo.srcObject = stream
            try {
              await targetVideo.play()
            } catch (playErr) {
              console.warn('Auto-play caught:', playErr)
            }
          }
        }, 50)
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      let msg = 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser.'
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda atau gunakan tombol Upload.'
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak terdeteksi pada perangkat Anda. Silakan gunakan tombol Upload Foto.'
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain. Silakan tutup aplikasi lain dan coba lagi.'
      } else if (err?.message) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setCameraLoading(false)
    }
  }

  const stopCamera = (type: 'id_card' | 'selfie') => {
    const streamRef = type === 'id_card' ? idCardStreamRef : selfieStreamRef
    const videoRef = type === 'id_card' ? idCardVideoRef : selfieVideoRef

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(null)
  }

  const capturePhoto = (type: 'id_card' | 'selfie') => {
    const video = type === 'id_card' ? idCardVideoRef.current : selfieVideoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          if (type === 'id_card') {
            setFormData(prev => ({ ...prev, id_card_photo: file }))
            setValidationErrors(prev => ({ ...prev, id_card_photo: '' }))
          } else {
            setFormData(prev => ({ ...prev, selfie_photo: file }))
            setValidationErrors(prev => ({ ...prev, selfie_photo: '' }))
          }
          stopCamera(type)
        }
      }, 'image/jpeg', 0.92)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera('id_card')
      stopCamera('selfie')
    }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'id_card_photo' | 'selfie_photo' | 'payment_proof') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validation = validateFile(file, ['image/'], 8)
      if (!validation.valid) {
        setError(validation.error || 'File tidak valid')
        return
      }
      setFormData(prev => ({ ...prev, [field]: file }))
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
      setError('')
    }
  }

  // Validation
  const validateStep1 = () => {
    const errs: { [key: string]: string } = {}
    const nameV = validateFullName(formData.full_name)
    if (!nameV.valid) errs.full_name = 'Nama lengkap minimal 2 karakter (hanya huruf dan spasi)'
    
    const phoneV = validatePhone(formData.phone)
    if (!phoneV.valid) errs.phone = 'Nomor telepon tidak valid (contoh: 08123456789)'

    if (formData.email) {
      const emailV = validateEmail(formData.email)
      if (!emailV.valid) errs.email = 'Format email tidak valid'
    }

    const idCardV = validateIdCardNumber(formData.id_card_number)
    if (!idCardV.valid) errs.id_card_number = 'Nomor KTP (NIK) harus 16 digit angka'

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.payment_proof) {
      if (paymentMethod === 'qris') {
        setError('Harap lampirkan bukti pembayaran QRIS')
      } else {
        setError('Harap foto dan lampirkan bukti serah terima uang tunai ke petugas resepsionis')
      }
      setLoading(false)
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('branch_id', branchId)
      submitData.append('full_name', sanitizeString(formData.full_name))
      submitData.append('phone', sanitizeString(formData.phone))
      submitData.append('email', sanitizeString(formData.email || ''))
      submitData.append('guarantee_type', guaranteeType)
      submitData.append('id_card_number', sanitizeString(formData.id_card_number || '-'))
      submitData.append('room_category', roomCategory)
      submitData.append('rental_duration', durationType)
      submitData.append('rental_days', durationType === 'daily' ? dailyDays.toString() : (durationType === 'weekly' ? (weeklyWeeks * 7).toString() : (monthlyMonths * 30).toString()))
      submitData.append('rental_weeks', weeklyWeeks.toString())
      submitData.append('rental_months', monthlyMonths.toString())
      submitData.append('deposit_amount', DEPOSIT_AMOUNT.toString())
      submitData.append('total_amount', totalAmount.toString())
      submitData.append('payment_method', paymentMethod)
      submitData.append('payment_destination', paymentMethod === 'qris' ? 'QRIS Standar Pembayaran Nasional - Graha Aisyah Menteng' : 'Resepsionis Tunai / Cash')
      submitData.append('terms_accepted', 'true')

      // Selected room type JSON for compatibility
      const isVip = roomCategory === 'vip'
      const roomTypeInfo = {
        category: roomCategory,
        name: isVip ? 'Kamar VIP Belakang Warkop' : 'Kamar Standard',
        monthly_package: durationType === 'monthly' ? monthlyPackage : undefined,
        price_per_day: BASE_PRICE_PER_DAY,
        price_per_week: BASE_PRICE_PER_WEEK,
        price_per_month: monthlyPackage === 'non_ac' ? BASE_PRICE_PER_MONTH_NON_AC : BASE_PRICE_PER_MONTH_AC,
        facilities: isVip
          ? ['Parkiran Lebih Luas', 'Kloset Duduk', 'Kamar Mandi Dalam', 'Single Bed', 'AC', 'Lemari Pakaian', 'Meja']
          : ['Kamar Mandi Dalam', 'Single Bed', monthlyPackage === 'non_ac' ? 'Non-AC' : 'AC', 'Lemari Pakaian', 'Meja Belajar'],
        notes: durationType !== 'daily' ? 'No include token PLN, handuk, sprei, dan selimut' : undefined
      }
      submitData.append('selected_room_type', JSON.stringify(roomTypeInfo))

      if (formData.id_card_photo) {
        submitData.append('id_card_photo', formData.id_card_photo)
      }
      if (formData.selfie_photo) {
        submitData.append('selfie_photo', formData.selfie_photo)
      }
      if (formData.payment_proof) {
        submitData.append('payment_proof', formData.payment_proof)
      }

      const res = await fetch('/api/check-in', {
        method: 'POST',
        body: submitData,
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal mengirim pendaftaran check-in')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses data')
    } finally {
      setLoading(false)
    }
  }

  // SUCCESS SCREEN
  if (success) {
    return (
      <div className="text-center py-6 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Pendaftaran Check-in Berhasil!
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Terima kasih, data reservasi Anda untuk <strong className="text-white">Graha Aisyah Menteng</strong> telah tersimpan di sistem.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 text-left space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <p className="text-xs text-slate-400 font-medium">Nama Tamu</p>
              <p className="text-base font-bold text-white">{formData.full_name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              roomCategory === 'vip' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              {roomCategory === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400">Durasi Sewa:</p>
              <p className="font-semibold text-slate-200">
                {durationType === 'daily' ? `${dailyDays} Hari (Harian)` : durationType === 'weekly' ? `${weeklyWeeks} Minggu (Mingguan)` : `${monthlyMonths} Bulan (${monthlyPackage === 'non_ac' ? 'Non-AC' : 'AC'})`}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Metode Bayar:</p>
              <p className="font-semibold text-slate-200 uppercase">
                {paymentMethod === 'qris' ? 'QRIS GoPay Merchant' : 'Tunai / Resepsionis'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">{guaranteeType === 'deposit' ? 'Deposit (Refundable):' : 'Jaminan Menginap:'}</p>
              <p className={`font-semibold ${guaranteeType === 'deposit' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {guaranteeType === 'deposit' ? 'Rp 100.000' : 'Jaminan KTP Asli (Rp 0)'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Total Tagihan:</p>
              <p className="font-bold text-indigo-400">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 text-left space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Building className="w-4 h-4" />
            <span>Langkah Selanjutnya di Meja Resepsionis:</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Tunjukkan KTP asli Anda ke resepsionis Graha Aisyah Menteng.</li>
            {paymentMethod === 'cash' ? (
              <li>Lakukan pembayaran tunai sebesar <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong> {guaranteeType === 'deposit' ? '(termasuk deposit Rp 100.000)' : ''}.</li>
            ) : (
              <li>Staf akan memverifikasi bukti pembayaran QRIS Anda dan menyerahkan kunci kamar.</li>
            )}
            {guaranteeType === 'deposit' ? (
              <li>Uang deposit Rp 100.000 akan dikembalikan tunai/transfer saat Anda check-out setelah penyerahan kunci.</li>
            ) : (
              <li>KTP asli yang dititipkan sebagai jaminan akan diserahkan kembali saat Anda check-out.</li>
            )}
            {durationType !== 'daily' && (
              <li className="text-amber-300">Untuk sewa {durationType === 'weekly' ? 'mingguan' : 'bulanan'}, token listrik PLN diisi mandiri dan perlengkapan tidur (sprei/selimut/handuk) disediakan mandiri.</li>
            )}
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-sm"
        >
          Selesai & Muat Ulang Form
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Stepper Indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[
          { num: 1, label: 'Data' },
          { num: 2, label: 'KTP' },
          { num: 3, label: 'Selfie' },
          { num: 4, label: 'Kamar' },
          { num: 5, label: 'Aturan' },
          { num: 6, label: 'Bayar' }
        ].map((s, idx, arr) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center select-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === s.num
                  ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-500/20 shadow-md scale-110'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-[10px] font-semibold mt-1 hidden sm:block ${
                step === s.num ? 'text-indigo-400 font-bold' : step > s.num ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {s.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                step > s.num ? 'bg-emerald-500' : 'bg-slate-800'
              }`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* =========================================================================
          STEP 1: DATA DIRI
      ========================================================================= */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Informasi Data Diri Tamu
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Isi data identitas sesuai dengan kartu identitas KTP Anda
            </p>
          </div>

          {/* Pilihan Jaminan Menginap */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Jaminan Kamar & Kunci *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opsi Deposit */}
              <div
                onClick={() => setGuaranteeType('deposit')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  guaranteeType === 'deposit'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-850/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">Deposit Rp 100.000</h4>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">KTP fisik tidak ditahan</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      guaranteeType === 'deposit'
                        ? 'border-indigo-500 bg-indigo-600'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      {guaranteeType === 'deposit' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deposit dikembalikan penuh saat checkout. KTP fisik asli tetap Anda bawa ke kamar.
                  </p>
                </div>
              </div>

              {/* Opsi KTP */}
              <div
                onClick={() => setGuaranteeType('ktp')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  guaranteeType === 'ktp'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-850/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">Titip KTP Fisik</h4>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">Tanpa biaya deposit (Rp 0)</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      guaranteeType === 'ktp'
                        ? 'border-indigo-500 bg-indigo-600'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      {guaranteeType === 'ktp' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    KTP fisik asli dititipkan di meja resepsionis selama masa inap dan dikembalikan saat checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nama Lengkap (Sesuai KTP) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap Anda"
                className={`w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  validationErrors.full_name ? 'border-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {validationErrors.full_name && (
              <p className="text-[11px] text-red-400 mt-1">{validationErrors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nomor WhatsApp / Telepon Aktif *
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 081234567890"
                className={`w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  validationErrors.phone ? 'border-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {validationErrors.phone && (
              <p className="text-[11px] text-red-400 mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Alamat Email (Opsional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nomor Induk Kependudukan (NIK KTP 16 Digit) *
            </label>
            <input
              type="text"
              required
              maxLength={16}
              value={formData.id_card_number}
              onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value.replace(/\D/g, '') })}
              placeholder="16 digit nomor NIK KTP"
              className={`w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-sm text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                validationErrors.id_card_number ? 'border-red-500' : 'border-slate-700'
              }`}
            />
            {validationErrors.id_card_number && (
              <p className="text-[11px] text-red-400 mt-1">{validationErrors.id_card_number}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) {
                setError('')
                setStep(2)
              }
            }}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 text-sm"
          >
            <span>Lanjut: Foto KTP</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          STEP 2: FOTO KTP DENGAN FRAME KARTU ID PROPORSIONAL
      ========================================================================= */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-3 mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Foto Kartu Identitas (KTP)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Posisikan KTP secara horizontal di dalam bingkai panduan kartu di bawah ini
            </p>
          </div>

          {/* Guarantee info notice in Step 2 */}
          <div className="p-3.5 bg-slate-850/80 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p>
              {guaranteeType === 'deposit'
                ? 'Catatan: Foto KTP digunakan untuk verifikasi identitas sistem. KTP fisik asli tetap Anda bawa karena memilih opsi jaminan deposit.'
                : 'Catatan: Foto KTP digunakan untuk verifikasi sistem, dan fisik KTP asli dititipkan ke staf resepsionis saat serah terima kunci.'}
            </p>
          </div>

          {!formData.id_card_photo ? (
            <div className="space-y-4">
              {/* ID Card Framing Container (Aspect Ratio 16:10 / 1.58:1) */}
              <div className="relative w-full max-w-md mx-auto aspect-[1.58/1] bg-slate-950 rounded-3xl overflow-hidden border-2 border-dashed border-indigo-500/40 flex items-center justify-center group shadow-2xl">
                {/* Permanent video element */}
                <video
                  ref={idCardVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive === 'id_card' ? 'block' : 'hidden'}`}
                />

                {cameraActive === 'id_card' ? (
                  /* Visual Card Guideline Overlay */
                  <div className="absolute inset-4 rounded-2xl border-2 border-indigo-400/80 pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600/80 text-white px-2 py-0.5 rounded-md backdrop-blur-md">
                        KTP INDONESIA
                      </span>
                      <div className="w-7 h-7 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-white/90 drop-shadow-md bg-black/40 px-3 py-1 rounded-full inline-block backdrop-blur-xs">
                        Posisikan KTP pas di dalam bingkai
                      </p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-7 h-7 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                      <div className="w-7 h-7 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Kamera KTP Belum Dibuka</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Klik Buka Kamera atau gunakan tombol Ambil / Upload Foto</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                {cameraActive === 'id_card' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => capturePhoto('id_card')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto KTP
                    </button>
                    <button
                      type="button"
                      onClick={() => stopCamera('id_card')}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Tutup Kamera
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startCamera('id_card')}
                      disabled={cameraLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      {cameraLoading ? 'Membuka Kamera...' : 'Buka Kamera'}
                    </button>

                    <label className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-center">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Ambil / Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'id_card_photo')}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Preview of Captured / Uploaded KTP Card */
            <div className="max-w-md mx-auto space-y-3">
              <div className="relative aspect-[1.58/1] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl">
                <img
                  src={URL.createObjectURL(formData.id_card_photo)}
                  alt="KTP Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> KTP Terpasang
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, id_card_photo: null })}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ulangi / Ganti Foto KTP
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                stopCamera('id_card')
                setStep(1)
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.id_card_photo) {
                  setError('Harap ambil atau unggah foto KTP terlebih dahulu')
                  return
                }
                stopCamera('id_card')
                setError('')
                setStep(3)
              }}
              disabled={!formData.id_card_photo}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Lanjut: Foto Selfie
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: FOTO SELFIE
      ========================================================================= */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-3 mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Foto Selfie Wajah Anda
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Posisikan wajah Anda di tengah bingkai lingkaran untuk verifikasi identitas
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {!formData.selfie_photo ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-xs mx-auto aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-dashed border-indigo-500/40 flex items-center justify-center shadow-2xl">
                {/* Permanent video element */}
                <video
                  ref={selfieVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] ${cameraActive === 'selfie' ? 'block' : 'hidden'}`}
                />

                {cameraActive === 'selfie' ? (
                  <div className="absolute inset-6 rounded-full border-2 border-dashed border-indigo-400/80 pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Posisikan Wajah
                    </span>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">Kamera Selfie</p>
                    <p className="text-[10px] text-slate-400">Klik Buka Kamera atau Ambil Foto Selfie</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
                {cameraActive === 'selfie' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => capturePhoto('selfie')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Selfie
                    </button>
                    <button
                      type="button"
                      onClick={() => stopCamera('selfie')}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Tutup Kamera
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startCamera('selfie')}
                      disabled={cameraLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      {cameraLoading ? 'Membuka Kamera...' : 'Buka Kamera'}
                    </button>

                    <label className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-center">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Ambil / Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'selfie_photo')}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-xs mx-auto space-y-3">
              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl">
                <img
                  src={URL.createObjectURL(formData.selfie_photo)}
                  alt="Selfie Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, selfie_photo: null })}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ulangi Foto Selfie
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                stopCamera('selfie')
                setStep(2)
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.selfie_photo) {
                  setError('Harap ambil atau unggah foto selfie Anda')
                  return
                }
                stopCamera('selfie')
                setError('')
                setStep(4)
              }}
              disabled={!formData.selfie_photo}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Lanjut: Pilih Kamar & Durasi
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: PILIH TIPE KAMAR (VIP / NON-VIP) & DURASI SEWA
      ========================================================================= */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-indigo-400" />
              Pilih Tipe Kamar & Durasi Sewa
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tarif sewa Rp 100.000 / malam untuk seluruh kamar
            </p>
          </div>

          {/* 1. Room Category Cards */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Pilih Kategori Kamar:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* VIP Card */}
              <div
                onClick={() => setRoomCategory('vip')}
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  roomCategory === 'vip'
                    ? 'border-purple-500 bg-purple-950/20 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/20'
                    : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs">
                      <Crown className="w-3.5 h-3.5 text-purple-300" />
                      VIP Belakang Warkop
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">Rp 100.000</span>
                      <span className="text-[10px] text-slate-400 block font-normal">/ malam</span>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white mb-1">VIP Belakang Warkop</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Kamar di area VIP Belakang Warkop dengan keunggulan <strong className="text-purple-300">Parkiran Lebih Luas & Kloset Duduk</strong>.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Parkiran Luas (Mobil & Motor)', 'Kloset Duduk', 'Kamar Mandi Dalam', 'Single Bed', 'AC Dingin', 'Lemari & Meja'].map(f => (
                      <span key={f} className="text-[10px] px-2.5 py-1 bg-slate-800/90 text-slate-300 rounded-lg border border-slate-700/60 font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`pt-2.5 border-t flex items-center justify-between text-xs font-bold ${
                  roomCategory === 'vip' ? 'border-purple-500/30 text-purple-300' : 'border-slate-800 text-slate-500'
                }`}>
                  <span>{roomCategory === 'vip' ? 'Kategori Dipilih' : 'Ketuk untuk memilih'}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    roomCategory === 'vip' ? 'bg-purple-500 text-white shadow-sm' : 'border border-slate-700'
                  }`}>
                    {roomCategory === 'vip' ? <Check className="w-3 h-3" /> : ''}
                  </div>
                </div>
              </div>

              {/* Non-VIP (Standard) Card */}
              <div
                onClick={() => setRoomCategory('non_vip')}
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  roomCategory === 'non_vip'
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                    : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs">
                      Standard • Dasar & Gedung Atas
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">Rp 100.000</span>
                      <span className="text-[10px] text-slate-400 block font-normal">/ malam</span>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white mb-1">Standard Room</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Kamar di Lantai Dasar dan Gedung Atas (Lt 2 & 3) dengan Single Bed, Kamar Mandi Dalam, Lemari Pakaian, dan Meja.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Kamar Mandi Dalam', 'Single Bed', 'AC / Non-AC', 'Meja Belajar', 'Lemari Pakaian'].map(f => (
                      <span key={f} className="text-[10px] px-2.5 py-1 bg-slate-800/90 text-slate-300 rounded-lg border border-slate-700/60 font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`pt-2.5 border-t flex items-center justify-between text-xs font-bold ${
                  roomCategory === 'non_vip' ? 'border-indigo-500/30 text-indigo-300' : 'border-slate-800 text-slate-500'
                }`}>
                  <span>{roomCategory === 'non_vip' ? 'Kategori Dipilih' : 'Ketuk untuk memilih'}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    roomCategory === 'non_vip' ? 'bg-indigo-500 text-white shadow-sm' : 'border border-slate-700'
                  }`}>
                    {roomCategory === 'non_vip' ? <Check className="w-3 h-3" /> : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Duration Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
              2. Pilih Durasi Sewa *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDurationType('daily')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  durationType === 'daily'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                Harian (Rp 100rb)
              </button>
              <button
                type="button"
                onClick={() => setDurationType('weekly')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  durationType === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                Mingguan (Rp 500rb)
              </button>
              <button
                type="button"
                onClick={() => setDurationType('monthly')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  durationType === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                Bulanan (Mulai 650rb)
              </button>
            </div>

            {/* Sub-inputs for duration */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
              {durationType === 'daily' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white">Jumlah Malam Menginap</p>
                      <p className="text-[11px] text-slate-400">Rp 100.000 / malam (Flat Seluruh Kamar)</p>
                    </div>

                    {/* Stepper +/- */}
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setDailyDays(Math.max(1, dailyDays - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-xs font-black text-white font-mono">
                        {dailyDays} Malam
                      </span>
                      <button
                        type="button"
                        onClick={() => setDailyDays(Math.min(30, dailyDays + 1))}
                        className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDailyDays(d)}
                        className={`flex-1 min-w-[42px] py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          dailyDays === d
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {durationType === 'weekly' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white">Jumlah Minggu</p>
                      <p className="text-[11px] text-indigo-400 font-bold">Tarif Rp 500.000 / minggu</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWeeklyWeeks(w)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            weeklyWeeks === w
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          {w} Mgg
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {durationType === 'monthly' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Pilihan Paket Fasilitas Bulanan:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setMonthlyPackage('ac')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          monthlyPackage === 'ac'
                            ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
                            <Wind className="w-3.5 h-3.5 text-indigo-400" /> Kamar Ber-AC
                          </span>
                          <span className="text-xs font-black text-white font-mono">Rp 1.350.000</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Unit kamar ber-AC dingin & kamar mandi dalam</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMonthlyPackage('non_ac')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          monthlyPackage === 'non_ac'
                            ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-emerald-300 flex items-center gap-1">
                            Kamar Non-AC / Standar
                          </span>
                          <span className="text-xs font-black text-white font-mono">Rp 650.000</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Hemat budget, kamar mandi dalam & kasur</p>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-white">Durasi Periode Bulan</p>
                      <p className="text-[11px] text-slate-400">
                        {monthlyPackage === 'non_ac' ? 'Rp 650.000 / bulan' : 'Rp 1.350.000 / bulan'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 3, 6, 12].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMonthlyMonths(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            monthlyMonths === m
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          {m} Bln
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Informative Notice Banner for Weekly and Monthly */}
              {durationType !== 'daily' && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ketentuan Khusus Sewa {durationType === 'weekly' ? 'Mingguan' : 'Bulanan'}:</span>
                  </div>
                  <ul className="text-[11px] text-amber-200/90 space-y-1 list-disc list-inside pl-1">
                    <li><strong>Token Listrik PLN:</strong> Belum termasuk token listrik (No Include). Pengisian token PLN dilakukan mandiri oleh penyewa per kamar.</li>
                    <li><strong>Perlengkapan Kamar:</strong> Tidak termasuk handuk, sprei, dan selimut (No Include). Penyewa dihimbau membawa perlengkapan tidur sendiri.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 3. Comprehensive Transparent Billing Breakdown Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Rincian Biaya Sewa
              </span>
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {roomCategory === 'vip' ? 'VIP Belakang Warkop' : 'Standard Room'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Rent item */}
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  Biaya Sewa ({durationType === 'daily' 
                    ? `${dailyDays} Malam (Harian)` 
                    : durationType === 'weekly' 
                      ? `${weeklyWeeks} Minggu (@ Rp 500rb)` 
                      : `${monthlyMonths} Bulan (${monthlyPackage === 'non_ac' ? 'Non-AC @ Rp 650rb' : 'AC @ Rp 1,35jt'})`}):
                </span>
                <span className="font-bold text-white font-mono">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentSubtotal)}
                </span>
              </div>

              {/* Deposit item */}
              <div className="flex justify-between text-slate-300">
                <div>
                  <span className="font-medium block">
                    {guaranteeType === 'deposit' ? 'Uang Titipan Deposit' : 'Jaminan Menginap (KTP Asli)'}
                  </span>
                  <span className="text-[10px] text-emerald-400 block font-normal">
                    {guaranteeType === 'deposit'
                      ? '(100% Dikembalikan utuh saat checkout)'
                      : '(Bebas Biaya Deposit • Jaminan KTP Asli)'}
                  </span>
                </div>
                <span className={`font-bold font-mono ${guaranteeType === 'deposit' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {guaranteeType === 'deposit' ? 'Rp 100.000' : 'Rp 0'}
                </span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl">
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Dibayar:</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {guaranteeType === 'deposit' ? 'Termasuk Deposit Rp 100k (Refundable)' : 'Hanya Sewa Kamar Saja (Rp 0 Deposit)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 font-mono">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 cursor-pointer transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
            >
              Lanjut: Aturan & Ketentuan
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5: SYARAT & KETENTUAN KOST
      ========================================================================= */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Syarat & Ketentuan Menginap
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kebijakan Graha Aisyah Menteng untuk kenyamanan bersama
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            {/* Clock Highlight */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Waktu Check-In & Check-Out:</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Check-in: Mulai pukul <strong>14:00 WIB</strong> • Check-out: Maksimal pukul <strong>12:00 WIB</strong>
              </p>
            </div>

            {/* Guarantee Policy Highlight */}
            <div className={`p-3 rounded-xl border space-y-1 ${
              guaranteeType === 'deposit'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Jaminan Menginap yang Anda Pilih:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {guaranteeType === 'deposit'
                  ? 'Anda memilih Opsi Deposit Rp 100.000 (Bebas tanpa foto/titip KTP). Uang titipan deposit Rp 100.000 akan dikembalikan utuh 100% saat checkout setelah kunci diserahkan.'
                  : 'Anda memilih Opsi Jaminan KTP Asli (Bebas Biaya Deposit Rp 0). Identitas/KTP Anda digunakan sebagai jaminan selama masa menginap dan akan dikembalikan saat checkout.'}
              </p>
            </div>

            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <p className="font-bold text-slate-100">Aturan Umum Kost:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>{guaranteeType === 'deposit' ? 'Uang deposit Rp 100.000 dikembalikan penuh saat checkout setelah kunci diserahkan dan kamar diperiksa.' : 'KTP asli/identitas Anda diserahkan/dititipkan sebagai jaminan dan akan dikembalikan saat checkout.'}</li>
                <li>Dilarang merokok di dalam kamar ber-AC.</li>
                <li>Dilarang membawa tamu lawan jenis menginap di dalam kamar.</li>
                <li>Wajib menjaga kebersihan dan ketenangan terutama setelah pukul 22:00 WIB.</li>
                <li>Dilarang membawa hewan peliharaan dan barang terlarang/narkoba.</li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={formData.terms_accepted}
              onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-200 leading-snug">
              Saya telah membaca, memahami, dan menyetujui seluruh kebijakan, aturan deposit, dan ketentuan denda keterlambatan check-out di Graha Aisyah Menteng. *
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.terms_accepted) {
                  setError('Anda harus menyetujui aturan dan kebijakan kost untuk melanjutkan')
                  return
                }
                setError('')
                setStep(6)
              }}
              disabled={!formData.terms_accepted}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Lanjut: Pembayaran
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 6: METODE PEMBAYARAN (QRIS GOPAY MERCHANT & CASH RESEPSIONIS)
      ========================================================================= */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-indigo-400" />
              Metode Pembayaran
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih cara pembayaran yang paling nyaman untuk Anda
            </p>
          </div>

          {/* Method Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setPaymentMethod('qris')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-center space-y-1.5 ${
                paymentMethod === 'qris'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                  : 'border-slate-800 bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <QrCode className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">QRIS Pembayaran Digital</p>
              <p className="text-[10px] text-slate-400">Scan Semua Bank & E-Wallet</p>
            </div>

            <div
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-center space-y-1.5 ${
                paymentMethod === 'cash'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Banknote className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">Cash / Bayar Tunai</p>
              <p className="text-[10px] text-slate-400">Bayar di meja resepsionis</p>
            </div>
          </div>

          {/* QRIS Display Section */}
          {paymentMethod === 'qris' && (
            <div className="space-y-4 bg-slate-950 p-5 rounded-3xl border border-slate-800">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Scan QRIS Standar Pembayaran Nasional (GPN)
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">GRAHA AISYAH KOST, MDN DNAI</h3>
                <p className="text-[10px] font-mono text-slate-400">
                  NMID: <strong className="text-slate-200">ID1026577450236</strong> • A01
                </p>
                <p className="text-[11px] text-slate-300 pt-1">
                  Total Tagihan: <strong className="text-indigo-400 text-sm">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong>
                </p>
              </div>

              {/* QR Image Box */}
              <div className="max-w-[280px] mx-auto bg-white p-2 rounded-2xl shadow-2xl border-2 border-slate-800">
                <img
                  src="/qris-graha-aisyah.png"
                  alt="QRIS GRAHA AISYAH KOST, MDN DNAI"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>

              {/* Upload Proof */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Upload Bukti Pembayaran QRIS *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required={paymentMethod === 'qris'}
                  onChange={(e) => handleFileUpload(e, 'payment_proof')}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {formData.payment_proof && (
                  <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Bukti transfer terlampir: {formData.payment_proof.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cash Resepsionis Section */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4 bg-slate-950 p-5 rounded-3xl border border-slate-800">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Banknote className="w-5 h-5" />
                  <span>Pembayaran Tunai di Meja Resepsionis</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Total yang diserahkan: <strong className="text-white">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong> {guaranteeType === 'deposit' ? '(termasuk deposit Rp 100.000)' : '(bebas deposit)'}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Untuk transparansi serah terima uang, silakan foto uang tunai saat diserahkan ke staf resepsionis.
                </p>
              </div>

              {/* Upload Foto Serah Terima Uang */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Foto Bukti Penyerahan Uang Tunai ke Petugas *</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Tamu memfotokan uang tunai saat diserahkan ke staf resepsionis sebagai bukti pembayaran yang sah untuk pemilik kost.
                </p>

                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required={paymentMethod === 'cash'}
                    onChange={(e) => handleFileUpload(e, 'payment_proof')}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />

                  {formData.payment_proof && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-300">Foto Serah Terima Terlampir</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{formData.payment_proof.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_proof: null }))}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading || !formData.payment_proof}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Reservasi...</span>
                </>
              ) : (
                <span>Konfirmasi & Selesaikan Check-in</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Clean Secure Footer */}
      <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>© {new Date().getFullYear()} Graha Aisyah Menteng. All rights reserved.</span>
        <span>Portal Registrasi Tamu Mandiri</span>
      </div>
    </form>
  )
}
