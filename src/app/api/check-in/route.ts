import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  validateFullName,
  validatePhone,
  validateEmail,
  validateIdCardNumber,
  validateFile,
  validateAmount,
  validateUUID,
  validateJSON,
  sanitizeString
} from '@/lib/validation'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op
        },
      },
    }
  )

  try {
    const formData = await request.formData()
    
    // Extract and validate all inputs
    const branch_id = formData.get('branch_id') as string
    const full_name = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const id_card_number = formData.get('id_card_number') as string
    const selected_room_type = formData.get('selected_room_type') as string
    const rental_duration = formData.get('rental_duration') as string
    const rental_days = formData.get('rental_days') as string
    const total_amount = formData.get('total_amount') as string
    const payment_destination = formData.get('payment_destination') as string
    const id_card_photo = formData.get('id_card_photo') as File
    const selfie_photo = formData.get('selfie_photo') as File
    const payment_proof = formData.get('payment_proof') as File

    // Server-side validation
    const errors: string[] = []

    // Validate branch_id (UUID)
    if (!branch_id || !validateUUID(branch_id)) {
      errors.push('Branch ID tidak valid')
    }

    // Validate and sanitize full_name
    if (!full_name) {
      errors.push('Nama lengkap wajib diisi')
    } else {
      const nameValidation = validateFullName(full_name)
      if (!nameValidation.valid) {
        errors.push('Nama lengkap tidak valid')
      }
    }

    // Validate and sanitize phone
    if (!phone) {
      errors.push('Nomor telepon wajib diisi')
    } else {
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.valid) {
        errors.push('Nomor telepon tidak valid')
      }
    }

    // Validate email (optional but must be valid if provided)
    let sanitizedEmail: string | null = null
    if (email) {
      const emailValidation = validateEmail(email)
      if (!emailValidation.valid) {
        errors.push('Format email tidak valid')
      } else {
        sanitizedEmail = emailValidation.sanitized
      }
    }

    // Validate ID card number
    if (!id_card_number) {
      errors.push('Nomor KTP wajib diisi')
    } else {
      const idCardValidation = validateIdCardNumber(id_card_number)
      if (!idCardValidation.valid) {
        errors.push('Nomor KTP harus 16 digit angka')
      }
    }

    // Validate room type
    if (!selected_room_type) {
      errors.push('Jenis kamar wajib dipilih')
    } else {
      const roomTypeValidation = validateJSON(selected_room_type)
      if (!roomTypeValidation.valid || !roomTypeValidation.data) {
        errors.push('Data jenis kamar tidak valid')
      }
    }

    // Validate rental duration
    if (!rental_duration || !['daily', 'monthly', '6months'].includes(rental_duration)) {
      errors.push('Durasi sewa tidak valid')
    }

    // Validate rental days for daily rental
    if (rental_duration === 'daily') {
      if (!rental_days) {
        errors.push('Jumlah hari wajib diisi untuk sewa harian')
      } else {
        const days = parseInt(rental_days)
        if (isNaN(days) || days < 1 || days > 365) {
          errors.push('Jumlah hari harus antara 1-365 hari')
        }
      }
    }

    // Validate amount
    if (!total_amount) {
      errors.push('Jumlah pembayaran wajib diisi')
    } else {
      const amountValidation = validateAmount(total_amount)
      if (!amountValidation.valid) {
        errors.push('Jumlah pembayaran tidak valid')
      }
    }

    // Validate payment destination
    if (!payment_destination) {
      errors.push('Tujuan transfer wajib diisi')
    }

    // Validate files
    if (!id_card_photo || id_card_photo.size === 0) {
      errors.push('Foto KTP wajib diisi')
    } else {
      const idCardFileValidation = validateFile(id_card_photo, ['image/'], 5)
      if (!idCardFileValidation.valid) {
        errors.push(idCardFileValidation.error || 'Foto KTP tidak valid')
      }
    }

    if (!selfie_photo || selfie_photo.size === 0) {
      errors.push('Foto selfie wajib diisi')
    } else {
      const selfieFileValidation = validateFile(selfie_photo, ['image/'], 5)
      if (!selfieFileValidation.valid) {
        errors.push(selfieFileValidation.error || 'Foto selfie tidak valid')
      }
    }

    if (!payment_proof || payment_proof.size === 0) {
      errors.push('Bukti transfer wajib diisi')
    } else {
      const proofFileValidation = validateFile(payment_proof, ['image/'], 5)
      if (!proofFileValidation.valid) {
        errors.push(proofFileValidation.error || 'Bukti transfer tidak valid')
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedName = validateFullName(full_name).sanitized
    const sanitizedPhone = validatePhone(phone).sanitized
    const sanitizedIdCard = validateIdCardNumber(id_card_number).sanitized
    const sanitizedPaymentDest = sanitizeString(payment_destination)
    const sanitizedAmount = validateAmount(total_amount).sanitized

    // Verify branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .single()

    if (branchError || !branch) {
      return NextResponse.json(
        { error: 'Cabang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Upload photos to Supabase Storage
    let id_card_photo_url = ''
    let selfie_photo_url = ''
    let payment_proof_url = ''

    // Upload ID card photo
    const idCardFileName = `check-in/${branch_id}/${Date.now()}-${sanitizedIdCard}-id-card.jpg`
    const { error: idCardError } = await supabase.storage
      .from('check-in-photos')
      .upload(idCardFileName, id_card_photo, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (idCardError) {
      return NextResponse.json(
        { error: 'Gagal mengupload foto KTP: ' + idCardError.message },
        { status: 500 }
      )
    }
    
    const { data: idCardUrlData } = supabase.storage
      .from('check-in-photos')
      .getPublicUrl(idCardFileName)
    id_card_photo_url = idCardUrlData.publicUrl

    // Upload selfie photo
    const selfieFileName = `check-in/${branch_id}/${Date.now()}-${sanitizedIdCard}-selfie.jpg`
    const { error: selfieError } = await supabase.storage
      .from('check-in-photos')
      .upload(selfieFileName, selfie_photo, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (selfieError) {
      return NextResponse.json(
        { error: 'Gagal mengupload foto selfie: ' + selfieError.message },
        { status: 500 }
      )
    }
    
    const { data: selfieUrlData } = supabase.storage
      .from('check-in-photos')
      .getPublicUrl(selfieFileName)
    selfie_photo_url = selfieUrlData.publicUrl

    // Upload payment proof
    const proofFileName = `check-in/${branch_id}/${Date.now()}-${sanitizedIdCard}-payment-proof.jpg`
    const { error: proofError } = await supabase.storage
      .from('check-in-photos')
      .upload(proofFileName, payment_proof, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (proofError) {
      return NextResponse.json(
        { error: 'Gagal mengupload bukti transfer: ' + proofError.message },
        { status: 500 }
      )
    }
    
    const { data: proofUrlData } = supabase.storage
      .from('check-in-photos')
      .getPublicUrl(proofFileName)
    payment_proof_url = proofUrlData.publicUrl

    // Parse and validate room type data
    const roomTypeData = validateJSON(selected_room_type)
    if (!roomTypeData.valid || !roomTypeData.data) {
      return NextResponse.json(
        { error: 'Data jenis kamar tidak valid' },
        { status: 400 }
      )
    }

    // Insert check-in request with sanitized data
    // Supabase uses parameterized queries, so SQL injection is already prevented
    const { error: insertError } = await supabase
      .from('check_in_requests')
      .insert({
        branch_id, // UUID validated
        full_name: sanitizedName, // Sanitized
        phone: sanitizedPhone, // Sanitized
        email: sanitizedEmail, // Sanitized or null
        id_card_number: sanitizedIdCard, // Sanitized (digits only)
        id_card_photo_url, // URL from storage
        selfie_photo_url, // URL from storage
        selected_room_type: selected_room_type, // JSON string (validated)
        rental_duration: rental_duration as 'daily' | 'monthly' | '6months', // Validated
        rental_days: rental_duration === 'daily' ? parseInt(rental_days) : null, // Only for daily
        total_amount: sanitizedAmount, // Validated number
        payment_destination: sanitizedPaymentDest, // Sanitized
        payment_proof_url, // URL from storage
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'pending'
      })

    if (insertError) {
      return NextResponse.json(
        { error: 'Gagal menyimpan data: ' + insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

