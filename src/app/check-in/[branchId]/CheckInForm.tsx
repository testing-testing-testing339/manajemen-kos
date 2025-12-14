'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  validateFullName, 
  validatePhone, 
  validateEmail, 
  validateIdCardNumber,
  validateFile,
  validateAmount,
  validateJSON,
  sanitizeString
} from '@/lib/validation'

interface CheckInFormProps {
  branchId: string
  branchName: string
}

export default function CheckInForm({ branchId, branchName }: CheckInFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_card_number: '',
    id_card_photo: null as File | null,
    selfie_photo: null as File | null,
    selected_room_type: '',
    terms_accepted: false,
    payment_proof: null as File | null,
  })
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomType, setSelectedRoomType] = useState<{
    key: string
    price: number
    price_per_day?: number | null
    price_per_month?: number | null
    price_per_6months?: number | null
    facilities: string[]
    count: number
  } | null>(null)
  const [rentalDuration, setRentalDuration] = useState<'daily' | '6months'>('daily')
  const [rentalDays, setRentalDays] = useState<number>(1) // For daily rental
  const [rentalDaysInput, setRentalDaysInput] = useState<string>('1') // For input field (allows empty)
  const [totalAmount, setTotalAmount] = useState(0)
  const [paymentDestination, setPaymentDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  const idCardVideoRef = useRef<HTMLVideoElement>(null)
  const selfieVideoRef = useRef<HTMLVideoElement>(null)
  const idCardStreamRef = useRef<MediaStream | null>(null)
  const selfieStreamRef = useRef<MediaStream | null>(null)

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`/api/branch/${branchId}/rooms`)
        if (response.ok) {
          const data = await response.json()
          if (data.error) {
            console.error('API Error:', data.error)
            setError(`Error: ${data.error}`)
          } else {
            setRooms(data || [])
            if (process.env.NODE_ENV === 'development') {
              console.log('Fetched rooms:', data)
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch rooms' }))
          console.error('Failed to fetch rooms:', errorData)
          setError(`Gagal memuat kamar: ${errorData.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error fetching rooms:', error)
        setError('Gagal memuat daftar kamar. Silakan coba lagi.')
      }
    }
    fetchRooms()
  }, [branchId])

  // Fetch payment destination
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const response = await fetch(`/api/branch/${branchId}/payment-info`)
        if (response.ok) {
          const data = await response.json()
          setPaymentDestination(data.destination || '')
        }
      } catch (error) {
        console.error('Error fetching payment info:', error)
      }
    }
    fetchPaymentInfo()
  }, [branchId])

  const startCamera = async (videoRef: React.RefObject<HTMLVideoElement | null>, streamRef: React.MutableRefObject<MediaStream | null>) => {
    // Prevent multiple simultaneous calls
    if (cameraLoading) return
    
    try {
      setCameraLoading(true)
      setError('')
      
      // Stop any existing stream first to prevent conflicts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        streamRef.current = null
      }
      
      // Also stop the other camera stream if it's active
      if (videoRef === idCardVideoRef && selfieStreamRef.current) {
        selfieStreamRef.current.getTracks().forEach(track => track.stop())
        selfieStreamRef.current = null
        if (selfieVideoRef.current) {
          selfieVideoRef.current.srcObject = null
        }
      } else if (videoRef === selfieVideoRef && idCardStreamRef.current) {
        idCardStreamRef.current.getTracks().forEach(track => track.stop())
        idCardStreamRef.current = null
        if (idCardVideoRef.current) {
          idCardVideoRef.current.srcObject = null
        }
      }
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: videoRef === selfieVideoRef ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      // Check if component is still mounted and video ref is still valid
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraPermission('granted')
        
        // Handle video load errors
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err)
            })
          }
        }
      } else {
        // Cleanup if ref is no longer valid
        stream.getTracks().forEach(track => track.stop())
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setCameraPermission('denied')
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      // Set appropriate error message
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda, lalu refresh halaman.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Kamera sedang digunakan oleh aplikasi lain. Silakan tutup aplikasi lain yang menggunakan kamera.')
      } else if (error.name === 'OverconstrainedError') {
        setError('Kamera tidak mendukung mode yang diminta. Mencoba mode alternatif...')
        // Try with simpler constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (videoRef.current && fallbackStream) {
            videoRef.current.srcObject = fallbackStream
            streamRef.current = fallbackStream
            setCameraPermission('granted')
            setError('')
          }
        } catch (fallbackError) {
          setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
        }
      } else {
        setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
      }
    } finally {
      setCameraLoading(false)
    }
  }

  const stopCamera = (streamRef: React.MutableRefObject<MediaStream | null>, videoRef?: React.RefObject<HTMLVideoElement | null>) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          track.enabled = false
        })
        streamRef.current = null
      }
      if (videoRef?.current) {
        videoRef.current.srcObject = null
        videoRef.current.pause()
      }
    } catch (error) {
      console.error('Error stopping camera:', error)
    }
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera(idCardStreamRef, idCardVideoRef)
      stopCamera(selfieStreamRef, selfieVideoRef)
    }
  }, [])

  const capturePhoto = (videoRef: React.RefObject<HTMLVideoElement | null>, type: 'id_card' | 'selfie') => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          
          // Validate file
          const fileValidation = validateFile(file, ['image/'], 5)
          if (!fileValidation.valid) {
            setError(fileValidation.error || 'File tidak valid')
            return
          }
          
          if (type === 'id_card') {
            setFormData({ ...formData, id_card_photo: file })
            setValidationErrors({ ...validationErrors, id_card_photo: '' })
          } else {
            setFormData({ ...formData, selfie_photo: file })
            setValidationErrors({ ...validationErrors, selfie_photo: '' })
          }
          setError('')
          stopCamera(
            type === 'id_card' ? idCardStreamRef : selfieStreamRef,
            type === 'id_card' ? idCardVideoRef : selfieVideoRef
          )
        }
      }, 'image/jpeg', 0.9)
    }
  }

  // Validate form data
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    // Validate full name
    const nameValidation = validateFullName(formData.full_name)
    if (!nameValidation.valid) {
      errors.full_name = 'Nama lengkap harus 2-100 karakter dan hanya mengandung huruf, spasi, titik, atau tanda hubung'
    }

    // Validate phone
    const phoneValidation = validatePhone(formData.phone)
    if (!phoneValidation.valid) {
      errors.phone = 'Nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx atau +628xxxxxxxxxx'
    }

    // Validate email (optional but must be valid if provided)
    if (formData.email) {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.valid) {
        errors.email = 'Format email tidak valid'
      }
    }

    // Validate ID card number
    const idCardValidation = validateIdCardNumber(formData.id_card_number)
    if (!idCardValidation.valid) {
      errors.id_card_number = 'Nomor KTP harus 16 digit angka'
    }

    // Validate photos
    if (!formData.id_card_photo) {
      errors.id_card_photo = 'Foto KTP wajib diisi'
    } else {
      const idCardFileValidation = validateFile(formData.id_card_photo, ['image/'], 5)
      if (!idCardFileValidation.valid) {
        errors.id_card_photo = idCardFileValidation.error || 'Foto KTP tidak valid'
      }
    }

    if (!formData.selfie_photo) {
      errors.selfie_photo = 'Foto selfie wajib diisi'
    } else {
      const selfieFileValidation = validateFile(formData.selfie_photo, ['image/'], 5)
      if (!selfieFileValidation.valid) {
        errors.selfie_photo = selfieFileValidation.error || 'Foto selfie tidak valid'
      }
    }

    // Validate room type selection
    if (!selectedRoomType) {
      errors.room_type = 'Jenis kamar harus dipilih'
    }

    // Validate payment proof
    if (!formData.payment_proof) {
      errors.payment_proof = 'Bukti transfer wajib diisi'
    } else {
      const proofFileValidation = validateFile(formData.payment_proof, ['image/'], 5)
      if (!proofFileValidation.valid) {
        errors.payment_proof = proofFileValidation.error || 'Bukti transfer tidak valid'
      }
    }

    // Validate terms acceptance
    if (!formData.terms_accepted) {
      errors.terms_accepted = 'Anda harus menyetujui kebijakan dan aturan kost'
    }

    // Validate amount
    const amountValidation = validateAmount(totalAmount)
    if (!amountValidation.valid) {
      errors.amount = 'Jumlah pembayaran tidak valid'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setValidationErrors({})

    // Client-side validation
    if (!validateForm()) {
      setError('Harap perbaiki kesalahan pada form sebelum melanjutkan')
      setLoading(false)
      return
    }

    try {
      // Sanitize inputs
      const sanitizedName = sanitizeString(formData.full_name)
      const phoneValidation = validatePhone(formData.phone)
      const emailValidation = formData.email ? validateEmail(formData.email) : { sanitized: '' }
      const idCardValidation = validateIdCardNumber(formData.id_card_number)

      const submitData = new FormData()
      submitData.append('branch_id', branchId)
      submitData.append('full_name', sanitizedName)
      submitData.append('phone', phoneValidation.sanitized)
      submitData.append('email', emailValidation.sanitized)
      submitData.append('id_card_number', idCardValidation.sanitized)
      
      // Send room type info (price and facilities) instead of specific room
      if (selectedRoomType) {
        const roomTypeData = {
          price: selectedRoomType.price,
          facilities: selectedRoomType.facilities
        }
        submitData.append('selected_room_type', JSON.stringify(roomTypeData))
      }
      
      submitData.append('total_amount', totalAmount.toString())
      submitData.append('payment_destination', sanitizeString(paymentDestination))
      submitData.append('terms_accepted', 'true')
      submitData.append('rental_duration', rentalDuration)
      if (rentalDuration === 'daily') {
        submitData.append('rental_days', rentalDays.toString())
      } else if (rentalDuration === '6months') {
        submitData.append('rental_days', '180') // 6 months = 180 days
      }
      
      if (formData.id_card_photo) {
        submitData.append('id_card_photo', formData.id_card_photo)
      }
      if (formData.selfie_photo) {
        submitData.append('selfie_photo', formData.selfie_photo)
      }
      if (formData.payment_proof) {
        submitData.append('payment_proof', formData.payment_proof)
      }

      const response = await fetch('/api/check-in', {
        method: 'POST',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Gagal mengirim permintaan check-in')
        return
      }

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Permintaan Check-in Berhasil!</h2>
        <p className="text-gray-600 mb-4">
          Terima kasih telah mengisi form check-in. Permintaan Anda sedang ditinjau oleh staff.
        </p>
        <p className="text-sm text-gray-500">
          Anda akan dihubungi segera setelah permintaan Anda disetujui.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Personal Information */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Diri</h2>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value })
                if (validationErrors.full_name) {
                  setValidationErrors({ ...validationErrors, full_name: '' })
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Masukkan nama lengkap"
              maxLength={100}
            />
            {validationErrors.full_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">No. Telepon *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value })
                if (validationErrors.phone) {
                  setValidationErrors({ ...validationErrors, phone: '' })
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="08xxxxxxxxxx"
              maxLength={15}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: '' })
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@example.com"
              maxLength={255}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">No. KTP *</label>
            <input
              type="text"
              required
              value={formData.id_card_number}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '')
                setFormData({ ...formData, id_card_number: value })
                if (validationErrors.id_card_number) {
                  setValidationErrors({ ...validationErrors, id_card_number: '' })
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.id_card_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="16 digit nomor KTP"
              maxLength={16}
            />
            {validationErrors.id_card_number && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.id_card_number}</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              // Validate step 1 before proceeding
              const errors: { [key: string]: string } = {}
              const nameValidation = validateFullName(formData.full_name)
              if (!nameValidation.valid) {
                errors.full_name = 'Nama lengkap harus 2-100 karakter dan hanya mengandung huruf, spasi, titik, atau tanda hubung'
              }
              const phoneValidation = validatePhone(formData.phone)
              if (!phoneValidation.valid) {
                errors.phone = 'Nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx atau +628xxxxxxxxxx'
              }
              if (formData.email) {
                const emailValidation = validateEmail(formData.email)
                if (!emailValidation.valid) {
                  errors.email = 'Format email tidak valid'
                }
              }
              const idCardValidation = validateIdCardNumber(formData.id_card_number)
              if (!idCardValidation.valid) {
                errors.id_card_number = 'Nomor KTP harus 16 digit angka'
              }
              
              if (Object.keys(errors).length > 0) {
                setValidationErrors(errors)
                setError('Harap perbaiki kesalahan pada form sebelum melanjutkan')
              } else {
                setValidationErrors({})
                setError('')
                setStep(2)
              }
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95"
          >
            Lanjutkan
          </button>
        </div>
      )}

      {/* Step 2: KTP Photo */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Penting: Izin Kamera</p>
                <p className="text-sm text-blue-800">Jika muncul popup izin kamera, silakan klik <strong>"Izinkan"</strong> atau <strong>"Allow"</strong> untuk melanjutkan.</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Foto KTP</h2>
          <p className="text-sm text-gray-600 mb-4">Ambil foto KTP Anda dengan jelas. Pastikan semua informasi terlihat.</p>
          
          {!formData.id_card_photo ? (
            <div className="space-y-3">
              <video
                ref={idCardVideoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-gray-300 max-h-64 object-cover"
                style={{ display: idCardStreamRef.current ? 'block' : 'none' }}
              />
              {!idCardStreamRef.current && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">Kamera belum dibuka</p>
                  <p className="text-sm text-gray-500">Klik tombol di bawah untuk membuka kamera</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => startCamera(idCardVideoRef, idCardStreamRef)}
                disabled={cameraLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cameraLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 2.627 8 5.292V7.292A8 8 0 014 12z"></path>
                    </svg>
                    Membuka kamera...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Buka Kamera untuk Foto KTP
                  </>
                )}
              </button>
              {idCardStreamRef.current && (
                <button
                  type="button"
                  onClick={() => capturePhoto(idCardVideoRef, 'id_card')}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-150 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ambil Foto KTP
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={URL.createObjectURL(formData.id_card_photo)}
                  alt="KTP"
                  className="w-full rounded-lg border-2 border-green-500 shadow-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, id_card_photo: null })
                      stopCamera(idCardStreamRef, idCardVideoRef)
                    }}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 hover:bg-red-600 shadow-md flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-semibold text-green-800">Foto KTP berhasil diambil</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                stopCamera(idCardStreamRef, idCardVideoRef)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.id_card_photo) {
                  setError('Harap ambil foto KTP terlebih dahulu')
                  setValidationErrors({ ...validationErrors, id_card_photo: 'Foto KTP wajib diisi' })
                  return
                }
                
                // Validate file
                const fileValidation = validateFile(formData.id_card_photo, ['image/'], 5)
                if (!fileValidation.valid) {
                  setError(fileValidation.error || 'Foto KTP tidak valid')
                  setValidationErrors({ ...validationErrors, id_card_photo: fileValidation.error || 'Foto KTP tidak valid' })
                  return
                }
                
                setValidationErrors({ ...validationErrors, id_card_photo: '' })
                setError('')
                setStep(3)
                stopCamera(idCardStreamRef, idCardVideoRef)
              }}
              disabled={!formData.id_card_photo}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Lanjutkan ke Selfie
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Selfie Photo */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Penting: Izin Kamera</p>
                <p className="text-sm text-blue-800">Jika muncul popup izin kamera, silakan klik <strong>"Izinkan"</strong> atau <strong>"Allow"</strong> untuk melanjutkan.</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Foto Selfie</h2>
          <p className="text-sm text-gray-600 mb-4">Ambil foto selfie Anda dengan jelas. Pastikan wajah terlihat penuh dan jelas.</p>
          
          {!formData.selfie_photo ? (
            <div className="space-y-3">
              <video
                ref={selfieVideoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-gray-300 max-h-64 object-cover"
                style={{ display: selfieStreamRef.current ? 'block' : 'none' }}
              />
              {!selfieStreamRef.current && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">Kamera belum dibuka</p>
                  <p className="text-sm text-gray-500">Klik tombol di bawah untuk membuka kamera</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => startCamera(selfieVideoRef, selfieStreamRef)}
                disabled={cameraLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cameraLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 2.627 8 5.292V7.292A8 8 0 014 12z"></path>
                    </svg>
                    Membuka kamera...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Buka Kamera untuk Selfie
                  </>
                )}
              </button>
              {selfieStreamRef.current && (
                <button
                  type="button"
                  onClick={() => capturePhoto(selfieVideoRef, 'selfie')}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-150 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ambil Selfie
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={URL.createObjectURL(formData.selfie_photo)}
                  alt="Selfie"
                  className="w-full rounded-lg border-2 border-green-500 shadow-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, selfie_photo: null })
                      stopCamera(selfieStreamRef, selfieVideoRef)
                    }}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 hover:bg-red-600 shadow-md flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-semibold text-green-800">Foto selfie berhasil diambil</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(2)
                stopCamera(selfieStreamRef, selfieVideoRef)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.selfie_photo) {
                  setError('Harap ambil foto selfie terlebih dahulu')
                  setValidationErrors({ ...validationErrors, selfie_photo: 'Foto selfie wajib diisi' })
                  return
                }
                
                // Validate file
                const fileValidation = validateFile(formData.selfie_photo, ['image/'], 5)
                if (!fileValidation.valid) {
                  setError(fileValidation.error || 'Foto selfie tidak valid')
                  setValidationErrors({ ...validationErrors, selfie_photo: fileValidation.error || 'Foto selfie tidak valid' })
                  return
                }
                
                setValidationErrors({ ...validationErrors, selfie_photo: '' })
                setError('')
                setStep(4) // Step 4: Room Selection
                stopCamera(selfieStreamRef, selfieVideoRef)
              }}
              disabled={!formData.selfie_photo}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Lanjutkan ke Pilih Kamar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Room Type Selection */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pilih Jenis Kamar</h2>
            <p className="text-sm text-gray-600">Pilih jenis kamar yang diinginkan. Kamar spesifik akan ditentukan oleh resepsionis.</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {(() => {
              // Group rooms by price and facilities to create room types
              const roomTypes = new Map<string, { 
                price: number, 
                price_per_day: number | null,
                price_per_month: number | null,
                price_per_6months: number | null,
                facilities: string[], 
                count: number 
              }>()
              
              rooms.forEach((room) => {
                const facilitiesStr = (room.facilities || []).join(', ') || 'Standard'
                // Use price_per_day as primary key since it's required
                const priceKey = (room as any).price_per_day || room.price || 0
                const key = `${priceKey}-${facilitiesStr}`
                
                if (roomTypes.has(key)) {
                  const existing = roomTypes.get(key)!
                  existing.count += 1
                } else {
                  roomTypes.set(key, {
                    price: room.price,
                    price_per_day: (room as any).price_per_day || null,
                    price_per_month: (room as any).price_per_month || null,
                    price_per_6months: (room as any).price_per_6months || null,
                    facilities: room.facilities || [],
                    count: 1
                  })
                }
              })

              const typesArray = Array.from(roomTypes.entries()).map(([key, value]) => ({
                key,
                ...value
              }))

              // Facility icon mapping
              const getFacilityIcon = (facility: string) => {
                const facilityLower = facility.toLowerCase()
                if (facilityLower.includes('ac') || facilityLower.includes('air conditioner')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                }
                if (facilityLower.includes('kamar mandi') || facilityLower.includes('bathroom') || facilityLower.includes('wc')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  )
                }
                if (facilityLower.includes('wifi') || facilityLower.includes('internet')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  )
                }
                if (facilityLower.includes('tv') || facilityLower.includes('televisi')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )
                }
                if (facilityLower.includes('lemari') || facilityLower.includes('wardrobe') || facilityLower.includes('closet')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )
                }
                if (facilityLower.includes('kasur') || facilityLower.includes('bed') || facilityLower.includes('tempat tidur')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )
                }
                if (facilityLower.includes('meja') || facilityLower.includes('table') || facilityLower.includes('desk')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )
                }
                if (facilityLower.includes('kipas') || facilityLower.includes('fan')) {
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                }
                // Default icon
                return (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              }

              return typesArray.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => {
                    setSelectedRoomType(type)
                    // Set default to daily price (required)
                    const dailyPrice = type.price_per_day || 0
                    setTotalAmount(dailyPrice)
                    setRentalDuration('daily')
                    setRentalDays(1)
                    setRentalDaysInput('1')
                  }}
                  className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                    selectedRoomType?.key === type.key
                      ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg shadow-indigo-200/50'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {/* Selected indicator */}
                  {selectedRoomType?.key === type.key && (
                    <div className="absolute top-4 right-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Room Type Header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        selectedRoomType?.key === type.key
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200'
                      }`}>
                        <svg className={`w-6 h-6 ${selectedRoomType?.key === type.key ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold ${
                          selectedRoomType?.key === type.key ? 'text-indigo-900' : 'text-gray-900'
                        }`}>
                          {(type.facilities && type.facilities.length > 0) ? type.facilities[0] : 'Kamar Standard'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {type.count} kamar tersedia
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Facilities */}
                  {type.facilities && type.facilities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Fasilitas:</p>
                      <div className="flex flex-wrap gap-2">
                        {type.facilities.map((facility, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              selectedRoomType?.key === type.key
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className="flex-shrink-0">
                              {getFacilityIcon(facility)}
                            </span>
                            <span>{facility}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Details */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Harga Sewa:</p>
                    <div className="space-y-1.5">
                      {/* Per Hari - Always shown (required) */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Per Hari</span>
                        <span className={`text-sm font-semibold ${
                          selectedRoomType?.key === type.key
                            ? 'text-indigo-600'
                            : 'text-gray-900'
                        }`}>
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(type.price_per_day || 0)}
                          {!type.price_per_day && (
                            <span className="text-xs text-red-500 ml-1">(Belum di-set)</span>
                          )}
                        </span>
                      </div>
                      {/* Per Bulan - Only if set */}
                      {(type as any).price_per_month && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Per Bulan</span>
                          <span className={`text-sm font-semibold ${
                            selectedRoomType?.key === type.key
                              ? 'text-indigo-600'
                              : 'text-gray-900'
                          }`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format((type as any).price_per_month)}
                          </span>
                        </div>
                      )}
                      {/* Per 6 Bulan - Only if set */}
                      {(type as any).price_per_6months && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Per 6 Bulan</span>
                          <span className={`text-sm font-semibold ${
                            selectedRoomType?.key === type.key
                              ? 'text-green-600'
                              : 'text-green-700'
                          }`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format((type as any).price_per_6months)}
                            <span className="text-xs text-green-600 ml-1">(Lebih hemat!)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            })()}
          </div>

          {rooms.length === 0 && (
            <p className="text-center text-gray-500 py-8">Tidak ada kamar tersedia</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedRoomType) {
                  // Validate that price_per_day is set
                  if (!selectedRoomType.price_per_day || selectedRoomType.price_per_day === 0) {
                    setError('Harga per hari belum di-set untuk jenis kamar ini. Silakan hubungi admin.')
                    return
                  }
                  // Set default to daily price
                  const dailyPrice = selectedRoomType.price_per_day || 0
                  setTotalAmount(dailyPrice)
                  setRentalDuration('daily')
                  setRentalDays(1)
                  setRentalDaysInput('1')
                  setStep(4.5) // New step for duration selection
                } else {
                  setError('Harap pilih jenis kamar terlebih dahulu')
                }
              }}
              disabled={!selectedRoomType}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Step 4.5: Rental Duration Selection */}
      {step === 4.5 && selectedRoomType && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pilih Durasi Sewa</h2>
            <p className="text-sm text-gray-600">Pilih jenis sewa dan durasi yang diinginkan</p>
          </div>

          {/* Duration Type Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Jenis Sewa *
            </label>
            <select
              value={rentalDuration}
              onChange={(e) => {
                const duration = e.target.value as 'daily' | '6months'
                setRentalDuration(duration)
                if (duration === 'daily') {
                  setRentalDays(1)
                  setRentalDaysInput('1')
                  setTotalAmount(selectedRoomType.price_per_day || 0)
                } else if (duration === '6months') {
                  setTotalAmount(selectedRoomType.price_per_6months || 0)
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="daily">Sewa Harian</option>
              {selectedRoomType.price_per_6months && (
                <option value="6months">Sewa Bulanan (6 Bulan)</option>
              )}
            </select>
            {rentalDuration === '6months' && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-semibold text-green-600">Info:</span> Sewa bulanan otomatis untuk 6 bulan. Tidak tersedia untuk 1 atau 2 bulan.
              </p>
            )}
          </div>

          {/* Daily Rental - Input Jumlah Hari */}
          {rentalDuration === 'daily' && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Jumlah Hari *
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={rentalDaysInput}
                onChange={(e) => {
                  const inputValue = e.target.value
                  // Allow empty input while typing
                  setRentalDaysInput(inputValue)
                  
                  // Only update rentalDays and total if input is valid
                  if (inputValue === '') {
                    // Keep current value while user is typing
                    return
                  }
                  
                  const days = parseInt(inputValue)
                  if (!isNaN(days) && days >= 1 && days <= 7) {
                    setRentalDays(days)
                    setTotalAmount((selectedRoomType.price_per_day || 0) * days)
                  }
                }}
                onBlur={(e) => {
                  const inputValue = e.target.value.trim()
                  if (inputValue === '') {
                    // If empty on blur, reset to 1
                    setRentalDaysInput('1')
                    setRentalDays(1)
                    setTotalAmount(selectedRoomType.price_per_day || 0)
                    return
                  }
                  
                  const days = parseInt(inputValue)
                  if (isNaN(days) || days < 1) {
                    // Invalid, reset to 1
                    setRentalDaysInput('1')
                    setRentalDays(1)
                    setTotalAmount(selectedRoomType.price_per_day || 0)
                  } else if (days > 7) {
                    // Too high, clamp to 7
                    setRentalDaysInput('7')
                    setRentalDays(7)
                    setTotalAmount((selectedRoomType.price_per_day || 0) * 7)
                  } else {
                    // Valid, ensure input matches
                    setRentalDaysInput(days.toString())
                    setRentalDays(days)
                    setTotalAmount((selectedRoomType.price_per_day || 0) * days)
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Masukkan jumlah hari (1-7)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maksimal 7 hari dalam sekali transaksi
              </p>
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Harga per hari:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRoomType.price_per_day || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Jumlah hari:</span>
                  <span className="text-sm font-semibold text-gray-900">{rentalDays} hari</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                  <span className="text-base font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format((selectedRoomType.price_per_day || 0) * rentalDays)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Rental (6 months) - Display Info */}
          {rentalDuration === '6months' && selectedRoomType.price_per_6months && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Sewa Bulanan (6 Bulan)</h3>
                  <p className="text-xs text-gray-600">Durasi sewa otomatis 6 bulan</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Harga untuk 6 bulan:</span>
                  <span className="text-lg font-bold text-green-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRoomType.price_per_6months)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-green-200">
                  <span className="text-sm text-gray-600">Harga per bulan (rata-rata):</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRoomType.price_per_6months / 6)}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-600 text-center">
                    <span className="font-semibold text-green-600">Lebih hemat!</span> Dibandingkan sewa harian
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (rentalDuration) {
                  setStep(5)
                } else {
                  setError('Harap pilih durasi sewa terlebih dahulu')
                }
              }}
              disabled={!rentalDuration}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Terms & Conditions */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kebijakan dan Aturan Kost</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto text-sm text-gray-700 space-y-2">
            <h3 className="font-semibold">Aturan Kost {branchName}:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Pembayaran sewa dilakukan setiap bulan pada tanggal yang telah ditentukan</li>
              <li>Dilarang merokok di dalam kamar</li>
              <li>Dilarang membawa tamu menginap tanpa izin</li>
              <li>Menjaga kebersihan kamar dan lingkungan kost</li>
              <li>Menjaga ketenangan setelah jam 22:00</li>
              <li>Dilarang melakukan aktivitas yang mengganggu ketertiban</li>
              <li>Segala kerusakan yang disebabkan oleh penghuni akan ditanggung oleh penghuni</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={formData.terms_accepted}
              onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
              className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Saya telah membaca dan menyetujui kebijakan dan aturan kost di atas *
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.terms_accepted) {
                  setStep(6)
                } else {
                  setError('Harap setujui kebijakan dan aturan kost terlebih dahulu')
                }
              }}
              disabled={!formData.terms_accepted}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Payment Summary */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ringkasan Pembayaran</h2>
            <p className="text-sm text-gray-600">Periksa detail pembayaran sebelum melanjutkan</p>
          </div>
          
          {/* Payment Details Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="space-y-4">
              {/* Room Type */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Jenis Kamar</p>
                    <p className="font-semibold text-gray-900">
                      {selectedRoomType && selectedRoomType.facilities && selectedRoomType.facilities.length > 0 
                        ? selectedRoomType.facilities[0]
                        : 'Kamar Standard'}
                    </p>
                    {selectedRoomType && selectedRoomType.facilities && selectedRoomType.facilities.length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        + {selectedRoomType.facilities.slice(1).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 italic">
                      * Kamar spesifik akan ditentukan oleh resepsionis
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {rentalDuration === 'daily' ? 'Harga Sewa Harian' : 'Harga Sewa Bulanan (6 Bulan)'}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {rentalDuration === 'daily' && selectedRoomType?.price_per_day ? (
                      <>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRoomType.price_per_day)}
                        <span className="text-xs font-normal text-gray-500 ml-1">× {rentalDays} hari</span>
                      </>
                    ) : rentalDuration === '6months' && selectedRoomType?.price_per_6months ? (
                      <>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRoomType.price_per_6months)}
                        <span className="text-xs font-normal text-gray-500 ml-1">/6 bulan</span>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t-2 border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Destination Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Tujuan Transfer</h3>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-gray-800 font-mono text-sm break-all">
                    {paymentDestination || (
                      <span className="text-gray-400 italic">Menunggu informasi...</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Bukti Transfer *</label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0]
                  const fileValidation = validateFile(file, ['image/'], 5)
                  
                  if (!fileValidation.valid) {
                    setError(fileValidation.error || 'Bukti transfer tidak valid')
                    setValidationErrors({ ...validationErrors, payment_proof: fileValidation.error || 'Bukti transfer tidak valid' })
                    e.target.value = '' // Reset input
                    return
                  }
                  
                  setFormData({ ...formData, payment_proof: file })
                  setValidationErrors({ ...validationErrors, payment_proof: '' })
                  setError('')
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.payment_proof ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validationErrors.payment_proof && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.payment_proof}</p>
            )}
            {formData.payment_proof && (
              <img
                src={URL.createObjectURL(formData.payment_proof)}
                alt="Bukti transfer"
                className="mt-2 w-full rounded-lg border-2 border-gray-300"
              />
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading || !formData.payment_proof}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100"
            >
              {loading ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

