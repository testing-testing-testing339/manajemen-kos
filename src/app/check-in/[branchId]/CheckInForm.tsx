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
  compressImage,
  captureVideoFrameToWebP,
  formatFileSize
} from '@/lib/imageCompressor'
import { getDailyRentalRate } from '@/lib/dateUtils'
import { 
  CreditCard, 
  Camera, 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
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
type DurationType = 'transit_morning' | 'daily' | 'weekly' | 'monthly'
type MonthlyPackage = 'ac' | 'non_ac'
type PaymentMethod = 'qris' | 'cash'
type GuaranteeType = 'deposit' | 'ktp'

export default function CheckInForm({ branchId, branchName }: CheckInFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [devMode, setDevMode] = useState(false)

  // Cek apakah diakses dari mode developer admin via URL param (?dev=true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('dev') === 'true') {
        setDevMode(true)
      }
    }
  }, [])

  // Helper untuk membuat dummy file testing di Dev Mode
  const createDummyFile = (filename: string): File => {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new File([byteArray], filename, { type: 'image/webp' })
  }

  // Auto-Fill data contoh untuk kemudahan testing admin
  const handleAutoFillDev = () => {
    const dummyKtp = createDummyFile('dummy_ktp_tester.webp')
    const dummySelfie = createDummyFile('dummy_selfie_tester.webp')
    const dummyProof = createDummyFile('dummy_payment_proof.webp')

    setFormData({
      full_name: 'Budi Santoso (Admin Dev Tester)',
      phone: '081234567890',
      email: 'admin.dev@grahaaisyah.com',
      id_card_number: '1234567890123456',
      id_card_photo: dummyKtp,
      selfie_photo: dummySelfie,
      terms_accepted: true,
      payment_proof: dummyProof,
    })
    setRoomCategory('vip')
    setDurationType('daily')
    setDailyDays(2)
    setMonthlyPackage('ac')
    setPaymentMethod('qris')
    setValidationErrors({})
    setError('')
  }

  const handleResetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      id_card_number: '',
      id_card_photo: null,
      selfie_photo: null,
      terms_accepted: false,
      payment_proof: null,
    })
    setStep(1)
    setValidationErrors({})
    setError('')
  }

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

  // Dynamic Daily Pricing based on WIB Time:
  // - 06:00 - 12:00 WIB: Rp 150.000 / malam (Check-in pagi transit)
  // - Setelah 12:00 WIB: Rp 100.000 / malam (Tarif normal)
  const [dailyRateInfo, setDailyRateInfo] = useState(getDailyRentalRate())

  useEffect(() => {
    setDailyRateInfo(getDailyRentalRate())
    const interval = setInterval(() => {
      setDailyRateInfo(getDailyRentalRate())
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Pricing Constants (Ketentuan Graha Aisyah Menteng)
  const PRICE_TRANSIT_MORNING = 100000 // Rp 100.000 (Sesi Pagi s/d 12:00 Siang)
  const BASE_PRICE_PER_DAY = dailyRateInfo.pricePerDay
  const BASE_PRICE_PER_WEEK = 500000 // Rp 500.000 / minggu
  const BASE_PRICE_PER_MONTH_AC = 1350000 // Rp 1.350.000 / bulan (Kamar AC / Berfasilitas)
  const BASE_PRICE_PER_MONTH_NON_AC = 650000 // Rp 650.000 / bulan (Kamar Non-AC / Non-Fasilitas)
  const DEPOSIT_AMOUNT = guaranteeType === 'deposit' ? 100000 : 0 // Rp 100k if deposit option, Rp 0 if KTP guarantee option

  // Calculated Totals
  const rentSubtotal = 
    durationType === 'transit_morning' ? PRICE_TRANSIT_MORNING :
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
  const [compressingField, setCompressingField] = useState<'id_card_photo' | 'selfie_photo' | 'payment_proof' | null>(null)
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

      // Try with facing mode (Selfie strictly uses front/user camera)
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
        msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda atau gunakan tombol Kamera HP.'
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Kamera depan tidak terdeteksi pada perangkat Anda. Silakan gunakan tombol Kamera HP.'
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

  const capturePhoto = async (type: 'id_card' | 'selfie') => {
    const video = type === 'id_card' ? idCardVideoRef.current : selfieVideoRef.current
    if (!video) return

    setCompressingField(type === 'id_card' ? 'id_card_photo' : 'selfie_photo')
    try {
      const file = await captureVideoFrameToWebP(video, type, 1400, 0.85, type === 'selfie')
      if (file) {
        if (type === 'id_card') {
          setFormData(prev => ({ ...prev, id_card_photo: file }))
          setValidationErrors(prev => ({ ...prev, id_card_photo: '' }))
        } else {
          setFormData(prev => ({ ...prev, selfie_photo: file }))
          setValidationErrors(prev => ({ ...prev, selfie_photo: '' }))
        }
        stopCamera(type)
      }
    } catch (capErr) {
      console.warn('Error capturing compressed photo:', capErr)
    } finally {
      setCompressingField(null)
    }
  }

  // Auto-start front camera when navigating to selfie step
  useEffect(() => {
    if (step === 3 && !formData.selfie_photo && !cameraActive) {
      startCamera('selfie')
    }
  }, [step])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera('id_card')
      stopCamera('selfie')
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'id_card_photo' | 'selfie_photo' | 'payment_proof') => {
    const inputElement = e.target
    if (inputElement.files && inputElement.files[0]) {
      const rawFile = inputElement.files[0]
      const validation = validateFile(rawFile, ['image/'], 20) // Accept up to 20MB raw, since we compress it down to ~150KB
      if (!validation.valid) {
        setError(validation.error || 'File tidak valid')
        inputElement.value = ''
        return
      }

      setCompressingField(field)
      setError('')
      try {
        // Compress to WebP with 1400px max dimension & 82% quality (visual lossless)
        const compressedFile = await compressImage(rawFile, {
          maxDimension: 1400,
          quality: 0.82,
          targetFormat: 'image/webp'
        })

        setFormData(prev => ({ ...prev, [field]: compressedFile }))
        setValidationErrors(prev => ({ ...prev, [field]: '' }))
      } catch (compErr) {
        console.warn('Compression error, using raw file as fallback:', compErr)
        setFormData(prev => ({ ...prev, [field]: rawFile }))
        setValidationErrors(prev => ({ ...prev, [field]: '' }))
      } finally {
        setCompressingField(null)
        inputElement.value = ''
      }
    }
  }

  // Validation
  const validateStep1 = () => {
    if (devMode) return true // Bypass in Dev Mode untuk kemudahan inspeksi admin
    const errs: { [key: string]: string } = {}
    
    const nameV = validateFullName(formData.full_name)
    if (!nameV.valid) {
      errs.full_name = 'Nama lengkap minimal 2 karakter (sesuai KTP)'
    }
    
    const phoneV = validatePhone(formData.phone)
    if (!phoneV.valid) {
      errs.phone = 'Nomor WhatsApp / telepon tidak valid (contoh: 081234567890)'
    }

    if (formData.email && formData.email.trim()) {
      const emailV = validateEmail(formData.email)
      if (!emailV.valid) {
        errs.email = 'Format email tidak valid (contoh: nama@email.com)'
      }
    }

    const idCardV = validateIdCardNumber(formData.id_card_number)
    if (!idCardV.valid) {
      errs.id_card_number = 'Nomor KTP (NIK) harus 16 digit angka'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.payment_proof && !devMode) {
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
      submitData.append('rental_days', durationType === 'transit_morning' ? '1' : (durationType === 'daily' ? dailyDays.toString() : (durationType === 'weekly' ? (weeklyWeeks * 7).toString() : (monthlyMonths * 30).toString())))
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
        rental_duration: durationType,
        monthly_package: durationType === 'monthly' ? monthlyPackage : undefined,
        price_per_day: durationType === 'transit_morning' ? PRICE_TRANSIT_MORNING : BASE_PRICE_PER_DAY,
        price_per_week: BASE_PRICE_PER_WEEK,
        price_per_month: monthlyPackage === 'non_ac' ? BASE_PRICE_PER_MONTH_NON_AC : BASE_PRICE_PER_MONTH_AC,
        facilities: isVip
          ? ['Parkiran Lebih Luas', 'Kloset Duduk', 'Kamar Mandi Dalam', 'Single Bed', 'AC', 'Lemari Pakaian', 'Meja']
          : ['Kamar Mandi Dalam', 'Single Bed', monthlyPackage === 'non_ac' ? 'Non-AC' : 'AC', 'Lemari Pakaian', 'Meja Belajar'],
        notes: durationType === 'transit_morning' ? 'Sewa Sesi Pagi (Wajib checkout jam 12:00 siang hari ini)' : ((durationType === 'weekly' || durationType === 'monthly') ? 'No include token PLN, handuk, sprei, dan selimut' : undefined)
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
                {durationType === 'transit_morning' 
                  ? 'Sesi Pagi (Wajib Checkout Jam 12:00 Siang)' 
                  : durationType === 'daily' 
                  ? `${dailyDays} Hari (Harian)` 
                  : durationType === 'weekly' 
                  ? `${weeklyWeeks} Minggu (Mingguan)` 
                  : `${monthlyMonths} Bulan (${monthlyPackage === 'non_ac' ? 'Non-AC' : 'AC'})`}
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Tombol Ringkas Auto-Fill Data Dummy (Hanya muncul jika URL mengandung ?dev=true) */}
      {devMode && (
        <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-amber-300">Mode Uji Coba Admin</span>
          </div>
          <button
            type="button"
            onClick={handleAutoFillDev}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
            title="Isi form otomatis dengan data dummy untuk kemudahan testing"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>Auto-Fill Data Dummy</span>
          </button>
        </div>
      )}

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
            <div 
              onClick={() => {
                if (devMode) {
                  setStep(s.num)
                  setError('')
                }
              }}
              className={`flex flex-col items-center select-none ${devMode ? 'cursor-pointer group' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === s.num
                  ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-500/20 shadow-md scale-110'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              } ${devMode ? 'group-hover:border-amber-400 group-hover:scale-105' : ''}`}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-[10px] font-semibold mt-1 hidden sm:block ${
                step === s.num ? 'text-indigo-400 font-bold' : step > s.num ? 'text-emerald-400' : 'text-slate-500'
              } ${devMode ? 'group-hover:text-amber-300' : ''}`}>
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
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
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
                inputMode="tel"
                autoComplete="tel"
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
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Alamat Email</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <input
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
              placeholder="nama@email.com"
              className={`w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                validationErrors.email ? 'border-red-500' : 'border-slate-700'
              }`}
            />
            {validationErrors.email && (
              <p className="text-[11px] text-red-400 mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nomor Induk Kependudukan (NIK KTP 16 Digit) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
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

                    <label 
                      htmlFor="id_card_photo_input"
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-center"
                    >
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Ambil / Upload File</span>
                      <input
                        id="id_card_photo_input"
                        type="file"
                        accept="image/*"
                        className="sr-only"
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
                if (!devMode && !formData.id_card_photo) {
                  setError('Harap ambil atau unggah foto KTP terlebih dahulu')
                  return
                }
                stopCamera('id_card')
                setError('')
                setStep(3)
              }}
              disabled={!devMode && !formData.id_card_photo}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Lanjut: Foto Selfie
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: FOTO SELFIE DENGAN KAMERA DEPAN LANGSUNG
      ========================================================================= */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-3 mb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                Foto Wajah Tamu (Kamera Depan)
              </h2>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Wajib Kamera Depan
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Foto wajah wajib diambil langsung dari kamera depan perangkat untuk verifikasi identitas check-in (tidak dapat menggunakan foto galeri).
            </p>
          </div>

          {compressingField === 'selfie_photo' ? (
            <div className="max-w-xs mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2.5">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Memproses Foto Wajah...</p>
              <p className="text-xs text-slate-400">Mengoptimalkan kualitas dan ukuran foto secara otomatis ke WebP</p>
            </div>
          ) : !formData.selfie_photo ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-xs mx-auto aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-dashed border-indigo-500/40 flex items-center justify-center shadow-2xl">
                {/* Permanent mirrored video element */}
                <video
                  ref={selfieVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${cameraActive === 'selfie' ? 'block' : 'hidden'}`}
                />

                {cameraActive === 'selfie' ? (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                    <div className="text-[10px] font-bold text-indigo-300 bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-md mx-auto border border-indigo-500/30">
                      Posisikan Wajah di Tengah
                    </div>

                    <div className="relative w-44 h-44 mx-auto border-2 border-dashed border-indigo-400/80 rounded-full flex items-center justify-center">
                      <div className="w-40 h-40 border border-indigo-400/30 rounded-full" />
                    </div>

                    <div className="text-[10px] text-center text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded-md backdrop-blur-md">
                      Buka kacamata/masker untuk kejelasan
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Kamera Depan Belum Aktif</p>
                      <p className="text-[11px] text-slate-400">Klik tombol di bawah untuk membuka kamera depan</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
                {cameraActive === 'selfie' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => capturePhoto('selfie')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto Wajah
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
                      {cameraLoading ? 'Membuka Kamera...' : 'Buka Kamera Depan'}
                    </button>

                    <label 
                      htmlFor="selfie_photo_input"
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-center" 
                      title="Buka kamera depan bawaan HP jika live stream tidak aktif"
                    >
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>Kamera Depan HP</span>
                      <input
                        id="selfie_photo_input"
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="sr-only"
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

              {/* Compression Badge */}
              <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terkompresi Otomatis (WebP)
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Ukuran: {formatFileSize(formData.selfie_photo.size)}
                </span>
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
                if (!devMode && !formData.selfie_photo) {
                  setError('Harap ambil atau unggah foto selfie Anda')
                  return
                }
                stopCamera('selfie')
                setError('')
                setStep(4)
              }}
              disabled={!devMode && !formData.selfie_photo}
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
              {dailyRateInfo.isMorningTransit 
                ? 'Tarif sewa pagi transit (06:00 – 12:00 WIB): Rp 150.000 / malam' 
                : 'Tarif sewa normal: Rp 100.000 / malam'}
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
                      <span className="text-sm font-black text-white">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BASE_PRICE_PER_DAY)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        / malam {dailyRateInfo.isMorningTransit ? '(Pagi)' : ''}
                      </span>
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
                      <span className="text-sm font-black text-white">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BASE_PRICE_PER_DAY)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        / malam {dailyRateInfo.isMorningTransit ? '(Pagi)' : ''}
                      </span>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDurationType('transit_morning')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  durationType === 'transit_morning'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>Sesi Pagi</span>
                <span className="text-[10px] font-normal opacity-90">Rp 100rb (s/d 12:00)</span>
              </button>
              <button
                type="button"
                onClick={() => setDurationType('daily')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  durationType === 'daily'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>Harian</span>
                <span className="text-[10px] font-normal opacity-90">Menginap</span>
              </button>
              <button
                type="button"
                onClick={() => setDurationType('weekly')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  durationType === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>Mingguan</span>
                <span className="text-[10px] font-normal opacity-90">Rp 500rb / mgg</span>
              </button>
              <button
                type="button"
                onClick={() => setDurationType('monthly')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  durationType === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>Bulanan</span>
                <span className="text-[10px] font-normal opacity-90">Mulai 650rb</span>
              </button>
            </div>

            {/* Sub-inputs for duration */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
              {durationType === 'transit_morning' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Paket Sesi Pagi / Transit (Beberapa Jam)</span>
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Biaya Flat: <strong className="text-white font-mono">Rp 100.000</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 shrink-0">
                      Wajib Checkout 12:00 Siang
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-amber-500/20 text-[11px] text-slate-300 space-y-1">
                    <p className="font-bold text-amber-200">Ketentuan Sewa Sesi Pagi:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      <li>Ditujukan untuk tamu yang masuk dini hari atau pagi hari (misal jam 01:00, 04:00, 08:00 WIB).</li>
                      <li><strong>Wajib check-out pada jam 12:00 siang hari ini juga</strong>.</li>
                      <li>Jika check-out melewati jam 12:00 siang, berlaku denda perpanjangan sesuai aturan kost.</li>
                    </ul>
                  </div>
                </div>
              )}
              {durationType === 'daily' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs font-extrabold text-white">Jumlah Malam Menginap</p>
                      <p className="text-[11px] text-indigo-400 font-bold">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BASE_PRICE_PER_DAY)} / malam
                      </p>
                    </div>

                    {/* Stepper +/- & editable input */}
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setDailyDays(Math.max(1, dailyDays - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        title="Kurangi 1 malam"
                      >
                        -
                      </button>
                      <div className="flex items-center justify-center px-1">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={dailyDays || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val) && val >= 1) {
                              setDailyDays(Math.min(90, val))
                            } else if (e.target.value === '') {
                              setDailyDays(1)
                            }
                          }}
                          className="w-10 text-center text-xs font-black text-white font-mono bg-transparent focus:outline-none focus:bg-slate-700/50 rounded py-0.5"
                        />
                        <span className="text-xs font-black text-indigo-400 select-none">Malam</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDailyDays(Math.min(90, dailyDays + 1))}
                        className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        title="Tambah 1 malam"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Time-based Rate Banner */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                    dailyRateInfo.isMorningTransit 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Clock className={`w-4 h-4 ${dailyRateInfo.isMorningTransit ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span>
                          {dailyRateInfo.isMorningTransit 
                            ? 'Tarif Khusus Check-In Pagi (06:00 – 12:00 WIB): Rp 150.000 / malam' 
                            : 'Tarif Normal (Setelah 12:00 WIB): Rp 100.000 / malam'}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">{dailyRateInfo.formattedTime}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {dailyRateInfo.isMorningTransit
                        ? 'Check-in pagi antara pukul 06:00 s/d 12:00 WIB dikenakan tarif Rp 150.000/malam. Setelah pukul 12:00 WIB berlaku tarif normal Rp 100.000/malam.'
                        : 'Sewa harian setelah pukul 12:00 WIB dikenakan tarif normal Rp 100.000/malam.'}
                    </p>
                  </div>
                </div>
              )}

              {durationType === 'weekly' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs font-extrabold text-white">Jumlah Durasi Minggu</p>
                      <p className="text-[11px] text-indigo-400 font-bold">Tarif Rp 500.000 / minggu</p>
                    </div>

                    {/* Stepper +/- & editable input */}
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setWeeklyWeeks(Math.max(1, weeklyWeeks - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        title="Kurangi 1 minggu"
                      >
                        -
                      </button>
                      <div className="flex items-center justify-center px-1">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={weeklyWeeks || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val) && val >= 1) {
                              setWeeklyWeeks(Math.min(24, val))
                            } else if (e.target.value === '') {
                              setWeeklyWeeks(1)
                            }
                          }}
                          className="w-10 text-center text-xs font-black text-white font-mono bg-transparent focus:outline-none focus:bg-slate-700/50 rounded py-0.5"
                        />
                        <span className="text-xs font-black text-indigo-400 select-none">Mgg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeeklyWeeks(Math.min(24, weeklyWeeks + 1))}
                        className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        title="Tambah 1 minggu"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {durationType === 'monthly' && (
                <div className="space-y-4">
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

                  {/* Bebas tentukan berapa bulan */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-white">Jumlah Durasi Bulan</p>
                        <p className="text-[11px] text-slate-400">
                          {monthlyPackage === 'non_ac' ? 'Rp 650.000' : 'Rp 1.350.000'} / bulan
                        </p>
                      </div>

                      {/* Stepper +/- & editable input */}
                      <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setMonthlyMonths(Math.max(1, monthlyMonths - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                          title="Kurangi 1 bulan"
                        >
                          -
                        </button>
                        <div className="flex items-center justify-center px-1">
                          <input
                            type="number"
                            min="1"
                            max="36"
                            value={monthlyMonths || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              if (!isNaN(val) && val >= 1) {
                                setMonthlyMonths(Math.min(36, val))
                              } else if (e.target.value === '') {
                                setMonthlyMonths(1)
                              }
                            }}
                            className="w-10 text-center text-xs font-black text-white font-mono bg-transparent focus:outline-none focus:bg-slate-700/50 rounded py-0.5"
                          />
                          <span className="text-xs font-black text-indigo-400 select-none">Bln</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMonthlyMonths(Math.min(36, monthlyMonths + 1))}
                          className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                          title="Tambah 1 bulan"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informative Notice Banner for Weekly and Monthly */}
              {(durationType === 'weekly' || durationType === 'monthly') && (
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
                  Biaya Sewa ({durationType === 'transit_morning' 
                    ? 'Sesi Pagi (s/d 12:00 Siang)' 
                    : durationType === 'daily' 
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
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Waktu & Ketentuan Tarif Check-In / Check-Out:</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Check-in standar: Mulai pukul <strong>14:00 WIB</strong> (Tarif normal <strong>Rp 100.000/malam</strong> setelah jam 12:00 WIB) • Check-out: Maksimal pukul <strong>12:00 WIB</strong>.
              </p>
              <p className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                * Check-in pagi antara pukul <strong>06:00 s/d 12:00 WIB</strong> dikenakan tarif transit pagi <strong>Rp 150.000/malam</strong>.
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
                if (!devMode && !formData.terms_accepted) {
                  setError('Anda harus menyetujui aturan dan kebijakan kost untuk melanjutkan')
                  return
                }
                setError('')
                setStep(6)
              }}
              disabled={!devMode && !formData.terms_accepted}
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
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Upload Bukti Pembayaran QRIS *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Maks. 20MB</span>
                </label>

                {compressingField === 'payment_proof' ? (
                  <div className="p-5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-xs text-indigo-300 animate-pulse">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                    <span className="font-semibold">Mengompres bukti pembayaran...</span>
                  </div>
                ) : formData.payment_proof ? (
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                        <img
                          src={URL.createObjectURL(formData.payment_proof)}
                          alt="Bukti Transfer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold truncate">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Bukti Pembayaran Siap</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px] sm:max-w-xs">
                          {formData.payment_proof.name}
                        </p>
                        <p className="text-[10px] text-indigo-300 font-medium">
                          {formatFileSize(formData.payment_proof.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <label 
                        htmlFor="qris_payment_proof_change"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 cursor-pointer transition-colors" 
                        title="Ganti File"
                      >
                        <span>Ganti</span>
                        <input
                          id="qris_payment_proof_change"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'payment_proof')}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_proof: null }))}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-xl border border-rose-500/30 cursor-pointer transition-colors"
                        title="Hapus File"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="qris_payment_proof"
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900 p-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">Pilih / Upload Bukti Transfer</p>
                      <p className="text-[10px] text-slate-400">Screenshot m-Banking / e-Wallet (JPG, PNG, WebP)</p>
                    </div>
                    <input
                      id="qris_payment_proof"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'payment_proof')}
                      className="sr-only"
                    />
                  </label>
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
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Foto Bukti Penyerahan Uang Tunai ke Petugas *</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Maks. 20MB</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-1">
                  Tamu memfotokan uang tunai saat diserahkan ke staf resepsionis sebagai bukti pembayaran yang sah untuk pemilik kost.
                </p>

                {compressingField === 'payment_proof' ? (
                  <div className="p-5 bg-slate-900/90 border border-emerald-500/30 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-xs text-emerald-300 animate-pulse">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                    <span className="font-semibold">Mengompres foto serah terima...</span>
                  </div>
                ) : formData.payment_proof ? (
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                        <img
                          src={URL.createObjectURL(formData.payment_proof)}
                          alt="Foto Serah Terima"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold truncate">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Foto Serah Terima Terlampir</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px] sm:max-w-xs">
                          {formData.payment_proof.name}
                        </p>
                        <p className="text-[10px] text-emerald-300 font-medium">
                          {formatFileSize(formData.payment_proof.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <label 
                        htmlFor="cash_payment_proof_change"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 cursor-pointer transition-colors" 
                        title="Ganti Foto"
                      >
                        <span>Ganti</span>
                        <input
                          id="cash_payment_proof_change"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload(e, 'payment_proof')}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_proof: null }))}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-xl border border-rose-500/30 cursor-pointer transition-colors"
                        title="Hapus Foto"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="cash_payment_proof"
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 hover:bg-slate-900 p-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Ambil Foto Uang Tunai (Kamera)</p>
                      <p className="text-[10px] text-slate-400">Foto uang tunai langsung di meja resepsionis (kamera HP)</p>
                    </div>
                    <input
                      id="cash_payment_proof"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileUpload(e, 'payment_proof')}
                      className="sr-only"
                    />
                  </label>
                )}
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
              disabled={loading || (!devMode && !formData.payment_proof)}
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
