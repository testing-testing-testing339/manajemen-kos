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
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [paymentDestination, setPaymentDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: videoRef === selfieVideoRef ? 'user' : 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
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
      submitData.append('selected_room_type', selectedRoom?.room_type || '')
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

      {/* Step 2: Photo Capture */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Foto KTP & Selfie</h2>
          
          {/* KTP Photo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto KTP *</label>
            {!formData.id_card_photo ? (
              <div className="space-y-2">
                <video
                  ref={idCardVideoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border-2 border-gray-300"
                  style={{ display: idCardStreamRef.current ? 'block' : 'none' }}
                />
                <button
                  type="button"
                  onClick={() => startCamera(idCardVideoRef, idCardStreamRef)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-150 active:scale-95"
                >
                  Buka Kamera untuk Foto KTP
                </button>
                {idCardStreamRef.current && (
                  <button
                    type="button"
                    onClick={() => capturePhoto(idCardVideoRef, 'id_card')}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-150 active:scale-95"
                  >
                    Ambil Foto KTP
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <img
                  src={URL.createObjectURL(formData.id_card_photo)}
                  alt="KTP"
                  className="w-full rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, id_card_photo: null })
                    stopCamera(idCardStreamRef)
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm transition-all duration-150 active:scale-95 hover:bg-red-600"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Selfie Photo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Selfie *</label>
            {!formData.selfie_photo ? (
              <div className="space-y-2">
                <video
                  ref={selfieVideoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border-2 border-gray-300"
                  style={{ display: selfieStreamRef.current ? 'block' : 'none' }}
                />
                <button
                  type="button"
                  onClick={() => startCamera(selfieVideoRef, selfieStreamRef)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-150 active:scale-95"
                >
                  Buka Kamera untuk Selfie
                </button>
                {selfieStreamRef.current && (
                  <button
                    type="button"
                    onClick={() => capturePhoto(selfieVideoRef, 'selfie')}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-150 active:scale-95"
                  >
                    Ambil Selfie
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <img
                  src={URL.createObjectURL(formData.selfie_photo)}
                  alt="Selfie"
                  className="w-full rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, selfie_photo: null })
                    stopCamera(selfieStreamRef)
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm transition-all duration-150 active:scale-95 hover:bg-red-600"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                stopCamera(idCardStreamRef)
                stopCamera(selfieStreamRef)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.id_card_photo && formData.selfie_photo) {
                  setStep(3)
                  stopCamera(idCardStreamRef)
                  stopCamera(selfieStreamRef)
                } else {
                  setError('Harap ambil foto KTP dan selfie terlebih dahulu')
                }
              }}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-150 active:scale-95 shadow-lg hover:shadow-xl"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Room Selection */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pilih Jenis Kamar</h2>
          
          <div className="grid gap-4">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setSelectedRoom(room)
                  setTotalAmount(parseFloat(room.price))
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all duration-150 active:scale-95 ${
                  selectedRoom?.id === room.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{room.room_number}</h3>
                    <p className="text-sm text-gray-600">{room.facilities?.join(', ') || 'Standard'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price)}
                    </p>
                    <p className="text-xs text-gray-500">/bulan</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {rooms.length === 0 && (
            <p className="text-center text-gray-500 py-8">Tidak ada kamar tersedia</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedRoom) {
                  setStep(4)
                } else {
                  setError('Harap pilih kamar terlebih dahulu')
                }
              }}
              disabled={!selectedRoom}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 disabled:active:scale-100 shadow-lg hover:shadow-xl"
            >
              Pesan Kamar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Terms & Conditions */}
      {step === 4 && (
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
              onClick={() => setStep(3)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.terms_accepted) {
                  setStep(5)
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

      {/* Step 5: Payment Summary */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Pembayaran</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Kamar:</span>
              <span className="font-semibold">{selectedRoom?.room_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Harga sewa:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedRoom?.price || 0)}
              </span>
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
              onClick={() => setStep(4)}
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

