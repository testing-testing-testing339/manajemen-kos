import { createClient } from '@supabase/supabase-js'
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
import { uploadImageToCloud } from '@/lib/cloudStorage'

export async function POST(request: Request) {
  // Use service role client if available to bypass RLS and guarantee branch verification & request submission
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )

  try {
    const formData = await request.formData()
    
    // Extract inputs
    let branch_id = formData.get('branch_id') as string
    const full_name = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const guarantee_type = (formData.get('guarantee_type') as string) || 'deposit'
    const id_card_number = formData.get('id_card_number') as string
    const selected_room_type = formData.get('selected_room_type') as string
    const room_category = (formData.get('room_category') as string) || 'vip'
    const rental_duration = (formData.get('rental_duration') as string) || 'daily'
    const rental_days = formData.get('rental_days') as string
    const rental_weeks = formData.get('rental_weeks') as string
    const rental_months = formData.get('rental_months') as string
    const deposit_amount = guarantee_type === 'deposit' ? ((formData.get('deposit_amount') as string) || '100000') : '0'
    const total_amount = formData.get('total_amount') as string
    const payment_method = (formData.get('payment_method') as string) || 'qris'
    const payment_destination = formData.get('payment_destination') as string
    const id_card_photo = formData.get('id_card_photo') as File | null
    const selfie_photo = formData.get('selfie_photo') as File
    const payment_proof = formData.get('payment_proof') as File | null

    const errors: string[] = []

    // Ensure branch_id is verified against real branches table to prevent foreign key violations
    let resolvedBranchId: string | null = null
    const isDummyUuid = branch_id === '00000000-0000-0000-0000-000000000001'

    if (branch_id && validateUUID(branch_id) && !isDummyUuid) {
      const { data: existingBranch } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branch_id)
        .maybeSingle()
      if (existingBranch?.id) {
        resolvedBranchId = existingBranch.id
      }
    }

    if (!resolvedBranchId) {
      const { data: firstBranch } = await supabase
        .from('branches')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstBranch?.id) {
        resolvedBranchId = firstBranch.id
      } else {
        // Auto-create default branch if branches table is empty
        const { data: createdBranch } = await supabase
          .from('branches')
          .insert({
            name: 'Graha Aisyah Menteng',
            address: 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'
          })
          .select('id')
          .maybeSingle()
        if (createdBranch?.id) {
          resolvedBranchId = createdBranch.id
        }
      }
    }

    if (!resolvedBranchId) {
      errors.push('Cabang Graha Aisyah Menteng tidak ditemukan di database')
    } else {
      branch_id = resolvedBranchId
    }

    // Validate full_name
    if (!full_name) {
      errors.push('Nama lengkap wajib diisi')
    } else {
      const nameValidation = validateFullName(full_name)
      if (!nameValidation.valid) {
        errors.push('Nama lengkap minimal 2 karakter')
      }
    }

    // Validate phone
    if (!phone) {
      errors.push('Nomor telepon wajib diisi')
    } else {
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.valid) {
        errors.push('Nomor telepon tidak valid')
      }
    }

    // Validate email (optional)
    let sanitizedEmail: string | null = null
    if (email) {
      const emailValidation = validateEmail(email)
      if (emailValidation.valid) {
        sanitizedEmail = emailValidation.sanitized
      }
    }

    // Validate ID card number (mandatory for system registration)
    let sanitizedIdCard: string = '-'
    if (!id_card_number) {
      errors.push('Nomor KTP wajib diisi')
    } else {
      const idCardValidation = validateIdCardNumber(id_card_number)
      if (!idCardValidation.valid) {
        errors.push('Nomor KTP harus 16 digit angka')
      } else {
        sanitizedIdCard = idCardValidation.sanitized
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

    // Validate files: KTP photo is mandatory for system registration
    if (!id_card_photo || id_card_photo.size === 0) {
      errors.push('Foto KTP wajib diunggah untuk verifikasi identitas')
    } else {
      const idCardFileValidation = validateFile(id_card_photo, ['image/'], 8)
      if (!idCardFileValidation.valid) {
        errors.push(idCardFileValidation.error || 'Foto KTP tidak valid')
      }
    }

    // Selfie photo is always mandatory for guest face verification
    if (!selfie_photo || selfie_photo.size === 0) {
      errors.push('Foto selfie wajib diisi')
    } else {
      const selfieFileValidation = validateFile(selfie_photo, ['image/'], 8)
      if (!selfieFileValidation.valid) {
        errors.push(selfieFileValidation.error || 'Foto selfie tidak valid')
      }
    }

    // Payment proof is mandatory for both QRIS and Cash handover photo
    if (!payment_proof || payment_proof.size === 0) {
      if (payment_method === 'qris') {
        errors.push('Bukti pembayaran QRIS wajib diunggah')
      } else {
        errors.push('Foto bukti serah terima uang tunai ke petugas resepsionis wajib diunggah')
      }
    } else {
      const proofFileValidation = validateFile(payment_proof, ['image/'], 8)
      if (!proofFileValidation.valid) {
        errors.push(proofFileValidation.error || 'Foto bukti pembayaran tidak valid')
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedName = validateFullName(full_name).sanitized
    const sanitizedPhone = validatePhone(phone).sanitized
    const sanitizedPaymentDest = sanitizeString(payment_destination || 'Graha Aisyah Menteng')
    const sanitizedAmount = validateAmount(total_amount).sanitized

    // Upload photos to Cloudinary (with automatic Supabase Storage fallback)
    let id_card_photo_url = ''
    let selfie_photo_url = ''
    let payment_proof_url = ''

    // Upload ID card photo if provided
    if (id_card_photo && id_card_photo.size > 0) {
      id_card_photo_url = await uploadImageToCloud(id_card_photo, {
        folder: `graha-aisyah/check-in/${branch_id}`,
        filenamePrefix: `${sanitizedIdCard || 'id'}-id-card`,
        fallbackBucket: 'check-in-photos'
      })
    }

    // Upload selfie photo
    if (selfie_photo && selfie_photo.size > 0) {
      selfie_photo_url = await uploadImageToCloud(selfie_photo, {
        folder: `graha-aisyah/check-in/${branch_id}`,
        filenamePrefix: `${sanitizedIdCard || 'selfie'}-selfie`,
        fallbackBucket: 'check-in-photos'
      })
    }

    if (!selfie_photo_url) {
      return NextResponse.json({ error: 'Gagal memproses foto selfie ke penyimpanan cloud' }, { status: 500 })
    }

    // Upload payment proof if provided
    if (payment_proof && payment_proof.size > 0) {
      payment_proof_url = await uploadImageToCloud(payment_proof, {
        folder: `graha-aisyah/check-in/${branch_id}`,
        filenamePrefix: `${sanitizedIdCard || 'payment'}-payment-proof`,
        fallbackBucket: 'check-in-photos'
      })
    } else {
      payment_proof_url = 'https://placehold.co/600x400/png?text=Bayar+Cash+di+Resepsionis'
    }

    // Insert into check_in_requests
    const basePayload = {
      branch_id,
      full_name: sanitizedName,
      phone: sanitizedPhone,
      email: sanitizedEmail,
      id_card_number: sanitizedIdCard,
      id_card_photo_url: id_card_photo_url || null,
      selfie_photo_url,
      selected_room_type,
      room_category: room_category || 'vip',
      rental_duration: rental_duration,
      rental_days: rental_days ? parseInt(rental_days) : (rental_duration === 'weekly' ? (rental_weeks ? parseInt(rental_weeks) * 7 : 7) : (rental_duration === 'monthly' ? (rental_months ? parseInt(rental_months) * 30 : 30) : 1)),
      rental_weeks: rental_weeks ? parseInt(rental_weeks) : 1,
      rental_months: rental_months ? parseInt(rental_months) : 1,
      deposit_amount: parseFloat(deposit_amount),
      total_amount: sanitizedAmount,
      payment_method: payment_method || 'qris',
      payment_destination: sanitizedPaymentDest,
      payment_proof_url,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      status: 'pending'
    }

    let { error: insertError } = await supabase
      .from('check_in_requests')
      .insert(basePayload)

    if (insertError) {
      // If DB constraint check_in_requests_rental_duration_check fails because 'transit_morning' / 'weekly' is not in older DB constraint enum:
      if (insertError.message?.includes('rental_duration') || insertError.message?.includes('check constraint')) {
        console.warn('DB rental_duration constraint triggered, retrying with fallback value daily:', insertError.message)
        const fallbackPayload = {
          ...basePayload,
          rental_duration: 'daily', // fallback so older PostgreSQL check constraint accepts it
          rental_days: rental_duration === 'transit_morning' ? 1 : (rental_duration === 'weekly' ? (rental_weeks ? parseInt(rental_weeks) * 7 : 7) : (rental_duration === 'monthly' ? (rental_months ? parseInt(rental_months) * 30 : 30) : (rental_days ? parseInt(rental_days) : 1)))
        }
        const { error: retryError } = await supabase
          .from('check_in_requests')
          .insert(fallbackPayload)
        
        if (!retryError) {
          return NextResponse.json({ success: true })
        }
        insertError = retryError
      }
      return NextResponse.json({ error: 'Gagal menyimpan reservasi: ' + insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Check-in server error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
