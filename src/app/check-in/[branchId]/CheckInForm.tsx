'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null) // Changed to room type instead of specific room
  const [totalAmount, setTotalAmount] = useState(0)
  const [paymentDestination, setPaymentDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')

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
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: videoRef === selfieVideoRef ? 'user' : 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraPermission('granted')
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setCameraPermission('denied')
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda, lalu refresh halaman.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.')
      } else {
        setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
      }
    }
  }

  const stopCamera = (streamRef: React.MutableRefObject<MediaStream | null>) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

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
          if (type === 'id_card') {
            setFormData({ ...formData, id_card_photo: file })
          } else {
            setFormData({ ...formData, selfie_photo: file })
          }
          stopCamera(type === 'id_card' ? idCardStreamRef : selfieStreamRef)
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const submitData = new FormData()
      submitData.append('branch_id', branchId)
      submitData.append('full_name', formData.full_name)
      submitData.append('phone', formData.phone)
      submitData.append('email', formData.email || '')
      submitData.append('id_card_number', formData.id_card_number)
      // Send room type info (price and facilities) instead of specific room
      submitData.append('selected_room_type', selectedRoomType ? JSON.stringify({
        price: selectedRoomType.price,
        facilities: selectedRoomType.facilities
      }) : '')
      submitData.append('total_amount', totalAmount.toString())
      submitData.append('payment_destination', paymentDestination)
      submitData.append('terms_accepted', 'true')
      
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
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">No. Telepon *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">No. KTP *</label>
            <input
              type="text"
              required
              value={formData.id_card_number}
              onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="16 digit nomor KTP"
            />
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
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
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Buka Kamera untuk Foto KTP
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
                      stopCamera(idCardStreamRef)
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
                stopCamera(idCardStreamRef)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.id_card_photo) {
                  setStep(3)
                  stopCamera(idCardStreamRef)
                } else {
                  setError('Harap ambil foto KTP terlebih dahulu')
                }
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
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Buka Kamera untuk Selfie
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
                      stopCamera(selfieStreamRef)
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
                stopCamera(selfieStreamRef)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.selfie_photo) {
                  setStep(4) // Step 4: Room Selection
                  stopCamera(selfieStreamRef)
                } else {
                  setError('Harap ambil foto selfie terlebih dahulu')
                }
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pilih Jenis Kamar</h2>
          <p className="text-sm text-gray-600 mb-4">Pilih jenis kamar yang diinginkan. Kamar spesifik akan ditentukan oleh resepsionis.</p>
          
          <div className="grid gap-4">
            {(() => {
              // Group rooms by price and facilities to create room types
              const roomTypes = new Map<string, { price: number, facilities: string[], count: number }>()
              
              rooms.forEach((room) => {
                const facilitiesStr = (room.facilities || []).join(', ') || 'Standard'
                const key = `${room.price}-${facilitiesStr}`
                
                if (roomTypes.has(key)) {
                  const existing = roomTypes.get(key)!
                  existing.count += 1
                } else {
                  roomTypes.set(key, {
                    price: room.price,
                    facilities: room.facilities || [],
                    count: 1
                  })
                }
              })

              const typesArray = Array.from(roomTypes.entries()).map(([key, value]) => ({
                key,
                ...value
              }))

              return typesArray.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => {
                    setSelectedRoomType(type)
                    setTotalAmount(parseFloat(type.price.toString()))
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all duration-150 active:scale-95 ${
                    selectedRoomType?.key === type.key
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {type.facilities.length > 0 ? type.facilities.join(', ') : 'Kamar Standard'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {type.count} kamar tersedia
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(type.price)}
                      </p>
                      <p className="text-xs text-gray-500">/bulan</p>
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
                  setStep(5)
                } else {
                  setError('Harap pilih jenis kamar terlebih dahulu')
                }
              }}
              disabled={!selectedRoomType}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Pesan Kamar
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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Pembayaran</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Jenis Kamar:</span>
              <span className="font-semibold">
                {selectedRoomType?.facilities?.length > 0 
                  ? selectedRoomType.facilities.join(', ') 
                  : 'Kamar Standard'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Harga sewa:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedRoomType?.price || 0)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              * Kamar spesifik akan ditentukan oleh resepsionis
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-indigo-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Tujuan Transfer:</h3>
            <p className="text-gray-700 font-mono">{paymentDestination || 'Menunggu informasi...'}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Bukti Transfer *</label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFormData({ ...formData, payment_proof: e.target.files[0] })
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
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

