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
  Wind, 
  Bath, 
  HelpCircle,
  RotateCcw
} from 'lucide-react'

interface CheckInFormProps {
  branchId: string
  branchName: string
}

type RoomCategory = 'vip' | 'non_vip'
type DurationType = 'daily' | 'weekly' | 'monthly'
type PaymentMethod = 'qris' | 'cash'

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

  // Room & Duration selections
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('vip')
  const [durationType, setDurationType] = useState<DurationType>('daily')
  const [dailyDays, setDailyDays] = useState<number>(1)
  const [weeklyWeeks, setWeeklyWeeks] = useState<number>(1)
  const [monthlyMonths, setMonthlyMonths] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')

  // Pricing Constants
  const BASE_PRICE_PER_DAY = 100000
  const BASE_PRICE_PER_WEEK = 700000 // 7 x 100rb
  const BASE_PRICE_PER_MONTH = 3000000 // 30 x 100rb
  const DEPOSIT_AMOUNT = 100000 // Refundable Deposit

  // Calculated Totals
  const rentSubtotal = 
    durationType === 'daily' ? BASE_PRICE_PER_DAY * dailyDays :
    durationType === 'weekly' ? BASE_PRICE_PER_WEEK * weeklyWeeks :
    BASE_PRICE_PER_MONTH * monthlyMonths

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
    if (!idCardV.valid) errs.id_card_number = 'Nomor KTP harus 16 digit angka'

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (paymentMethod === 'qris' && !formData.payment_proof) {
      setError('Harap lampirkan bukti pembayaran QRIS')
      setLoading(false)
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('branch_id', branchId)
      submitData.append('full_name', sanitizeString(formData.full_name))
      submitData.append('phone', sanitizeString(formData.phone))
      submitData.append('email', sanitizeString(formData.email || ''))
      submitData.append('id_card_number', sanitizeString(formData.id_card_number))
      submitData.append('room_category', roomCategory)
      submitData.append('rental_duration', durationType)
      submitData.append('rental_days', durationType === 'daily' ? dailyDays.toString() : (durationType === 'weekly' ? (weeklyWeeks * 7).toString() : (monthlyMonths * 30).toString()))
      submitData.append('rental_weeks', weeklyWeeks.toString())
      submitData.append('rental_months', monthlyMonths.toString())
      submitData.append('deposit_amount', DEPOSIT_AMOUNT.toString())
      submitData.append('total_amount', totalAmount.toString())
      submitData.append('payment_method', paymentMethod)
      submitData.append('payment_destination', paymentMethod === 'qris' ? 'QRIS GoPay Merchant - Graha Aisyah Menteng' : 'Resepsionis Tunai / Cash')
      submitData.append('terms_accepted', 'true')

      // Selected room type JSON for compatibility
      const roomTypeInfo = {
        category: roomCategory,
        name: roomCategory === 'vip' ? 'Kamar VIP' : 'Kamar Non-VIP',
        price_per_day: BASE_PRICE_PER_DAY,
        facilities: roomCategory === 'vip'
          ? ['AC', 'Kamar Mandi Dalam', 'Smart TV', 'Wifi High-Speed', 'Queen Bed', 'Lemari Pakaian', 'Meja Kerja', 'Water Heater']
          : ['AC', 'Kamar Mandi Dalam', 'Wifi High-Speed', 'Single Bed', 'Lemari Pakaian', 'Meja Belajar']
      }
      submitData.append('selected_room_type', JSON.stringify(roomTypeInfo))

      if (formData.id_card_photo) {
        submitData.append('id_card_photo', formData.id_card_photo)
      }
      if (formData.selfie_photo) {
        submitData.append('selfie_photo', formData.selfie_photo)
      }
      if (formData.payment_proof && paymentMethod === 'qris') {
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
              roomCategory === 'vip' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {roomCategory === 'vip' ? 'Kamar VIP' : 'Kamar Non-VIP'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400">Durasi Sewa:</p>
              <p className="font-semibold text-slate-200">
                {durationType === 'daily' ? `${dailyDays} Hari` : durationType === 'weekly' ? `${weeklyWeeks} Minggu` : `${monthlyMonths} Bulan`}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Metode Bayar:</p>
              <p className="font-semibold text-slate-200 uppercase">
                {paymentMethod === 'qris' ? 'QRIS GoPay Merchant' : 'Tunai / Resepsionis'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Deposit (Refundable):</p>
              <p className="font-semibold text-emerald-400">Rp 100.000</p>
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
              <li>Lakukan pembayaran tunai sebesar <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong> (termasuk deposit Rp 100.000).</li>
            ) : (
              <li>Staf akan memverifikasi bukti pembayaran QRIS Anda dan menyerahkan kunci kamar.</li>
            )}
            <li>Deposit Rp 100.000 akan dikembalikan tunai/transfer saat Anda check-out.</li>
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
            <div className="flex flex-col items-center">
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
                placeholder="Masukkan nama lengkap"
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
              <User className="w-5 h-5 text-indigo-400" />
              Foto Selfie Tamu
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ambil foto selfie wajah Anda dengan pencahayaan yang cukup
            </p>
          </div>

          {!formData.selfie_photo ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-xs mx-auto aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-dashed border-indigo-500/40 flex items-center justify-center shadow-2xl">
                {/* Permanent video element */}
                <video
                  ref={selfieVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive === 'selfie' ? 'block' : 'hidden'}`}
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-indigo-400" />
              Pilih Tipe Kamar & Durasi Sewa
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Graha Aisyah Menteng memiliki 53 kamar dengan harga seragam Rp 100.000 / malam
            </p>
          </div>

          {/* Room Category Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              1. Pilih Kategori Kamar:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* VIP Card */}
              <div
                onClick={() => setRoomCategory('vip')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  roomCategory === 'vip'
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Kamar VIP (13 Kamar)
                  </span>
                  <span className="text-xs font-black text-purple-400">Rp 100.000 / malam</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">VIP Suite Room</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Kamar eksklusif berfasilitas lengkap dengan Smart TV, Queen Bed, AC, dan Kamar Mandi Dalam.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['AC', 'Kamar Mandi Dalam', 'Smart TV', 'Wifi', 'Queen Bed', 'Water Heater'].map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Non-VIP Card */}
              <div
                onClick={() => setRoomCategory('non_vip')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  roomCategory === 'non_vip'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Kamar Non-VIP (40 Kamar)
                  </span>
                  <span className="text-xs font-black text-indigo-400">Rp 100.000 / malam</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Standard Room</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Kamar nyaman dengan AC, Single Bed, Kamar Mandi Dalam, Lemari, dan Wifi High Speed.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['AC', 'Kamar Mandi Dalam', 'Single Bed', 'Wifi High-Speed', 'Meja Belajar'].map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              2. Pilih Pilihan Durasi Sewa:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDurationType('daily')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  durationType === 'daily'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => setDurationType('weekly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  durationType === 'weekly'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Mingguan
              </button>
              <button
                type="button"
                onClick={() => setDurationType('monthly')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  durationType === 'monthly'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Bulanan
              </button>
            </div>

            {/* Sub-inputs for duration */}
            <div className="mt-3 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80">
              {durationType === 'daily' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Jumlah Hari Menginap</p>
                    <p className="text-[11px] text-slate-400">Rp 100.000 / malam</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDailyDays(d)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          dailyDays === d
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {durationType === 'weekly' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Jumlah Minggu</p>
                    <p className="text-[11px] text-slate-400">Rp 700.000 / minggu (7 hari)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeeklyWeeks(w)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          weeklyWeeks === w
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {w} Minggu
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {durationType === 'monthly' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Jumlah Bulan</p>
                    <p className="text-[11px] text-slate-400">Rp 3.000.000 / bulan</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 3, 6, 12].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonthlyMonths(m)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          monthlyMonths === m
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {m} Bln
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Notification Card */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Uang Jaminan Deposit (Refundable)
              </span>
              <span>Rp 100.000</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Deposit sebesar <strong>Rp 100.000</strong> akan dikembalikan utuh ke rekening / tunai Anda saat check-out setelah pemeriksaan kamar selesai.
            </p>
          </div>

          {/* Price Breakdown Summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Biaya Sewa ({durationType === 'daily' ? `${dailyDays} hari` : durationType === 'weekly' ? `${weeklyWeeks} minggu` : `${monthlyMonths} bulan`}):</span>
              <span className="font-semibold text-slate-200">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rentSubtotal)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uang Deposit (Dikembalikan saat checkout):</span>
              <span className="font-semibold text-emerald-400">Rp 100.000</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Total Pembayaran:</span>
              <span className="text-lg font-black text-indigo-400">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Lanjut: Aturan & Ketentuan
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5: SYARAT & KETENTUAN (TERMASUK DENDA TELAT CHECKOUT)
      ========================================================================= */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Kebijakan & Aturan Graha Aisyah Menteng
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Harap baca dan setujui ketentuan operasional sebelum melanjutkan
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 max-h-60 overflow-y-auto space-y-3 text-xs text-slate-300 leading-relaxed pr-2">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-amber-200">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Ketentuan Waktu & Denda Checkout:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-300/90 pl-1">
                <li>Waktu check-in mulai pukul <strong>14:00 WIB</strong>.</li>
                <li>Waktu check-out maksimal pukul <strong>12:00 WIB</strong> siang.</li>
                <li>Telat check-out sampai pukul <strong>15:00 WIB (3 sore)</strong> dikenakan denda charge <strong>Rp 50.000</strong>.</li>
                <li>Telat check-out lewat pukul <strong>15:00 s/d 17:00 WIB (5 sore)</strong> dikenakan denda charge <strong>Rp 100.000</strong>.</li>
                <li>Telat lewat pukul <strong>17:00 WIB</strong> dikenakan biaya 1 hari penuh (<strong>Rp 100.000</strong>).</li>
              </ul>
            </div>

            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <p className="font-bold text-slate-100">Aturan Umum Kost:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Uang deposit Rp 100.000 dikembalikan penuh saat checkout setelah kunci diserahkan dan kamar diperiksa.</li>
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
              <p className="text-xs font-bold text-white">QRIS GoPay Merchant</p>
              <p className="text-[10px] text-slate-400">Scan & bayar online</p>
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
                  Scan QRIS GoPay Merchant
                </span>
                <h3 className="text-sm font-bold text-white">Graha Aisyah Menteng</h3>
                <p className="text-[11px] text-slate-400">
                  Total Transfer: <strong className="text-indigo-400 text-sm">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong>
                </p>
              </div>

              {/* QR Image Box */}
              <div className="max-w-[260px] mx-auto bg-white p-3 rounded-2xl shadow-xl border-4 border-slate-800">
                <img
                  src="/qris-gopay.svg"
                  alt="QRIS GoPay Merchant Graha Aisyah Menteng"
                  className="w-full h-auto rounded-lg"
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
            <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-3xl space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Bayar Tunai di Resepsionis</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Anda dapat langsung datang ke meja resepsionis <strong>Graha Aisyah Menteng</strong> untuk menyerahkan pembayaran tunai sebesar <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}</strong> (termasuk deposit Rp 100.000).
              </p>
              <p className="text-[11px] text-slate-400 italic">
                * Kunci kamar akan diserahkan setelah pembayaran tunai diterima oleh staf resepsionis.
              </p>
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
              disabled={loading || (paymentMethod === 'qris' && !formData.payment_proof)}
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
    </form>
  )
}
