import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  const formData = await request.formData()
  
  const branch_id = formData.get('branch_id') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const id_card_number = formData.get('id_card_number') as string
  const selected_room_type = formData.get('selected_room_type') as string
  const total_amount = formData.get('total_amount') as string
  const payment_destination = formData.get('payment_destination') as string
  const id_card_photo = formData.get('id_card_photo') as File
  const selfie_photo = formData.get('selfie_photo') as File
  const payment_proof = formData.get('payment_proof') as File

  // Upload photos to Supabase Storage
  let id_card_photo_url = ''
  let selfie_photo_url = ''
  let payment_proof_url = ''

  try {
    // Upload ID card photo
    if (id_card_photo) {
      const idCardFileName = `check-in/${branch_id}/${Date.now()}-id-card.jpg`
      const { error: idCardError } = await supabase.storage
        .from('check-in-photos')
        .upload(idCardFileName, id_card_photo, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (!idCardError) {
        const { data: idCardUrlData } = supabase.storage
          .from('check-in-photos')
          .getPublicUrl(idCardFileName)
        id_card_photo_url = idCardUrlData.publicUrl
      }
    }

    // Upload selfie photo
    if (selfie_photo) {
      const selfieFileName = `check-in/${branch_id}/${Date.now()}-selfie.jpg`
      const { error: selfieError } = await supabase.storage
        .from('check-in-photos')
        .upload(selfieFileName, selfie_photo, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (!selfieError) {
        const { data: selfieUrlData } = supabase.storage
          .from('check-in-photos')
          .getPublicUrl(selfieFileName)
        selfie_photo_url = selfieUrlData.publicUrl
      }
    }

    // Upload payment proof
    if (payment_proof) {
      const proofFileName = `check-in/${branch_id}/${Date.now()}-payment-proof.jpg`
      const { error: proofError } = await supabase.storage
        .from('check-in-photos')
        .upload(proofFileName, payment_proof, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (!proofError) {
        const { data: proofUrlData } = supabase.storage
          .from('check-in-photos')
          .getPublicUrl(proofFileName)
        payment_proof_url = proofUrlData.publicUrl
      }
    }

    // Insert check-in request
    const { error: insertError } = await supabase
      .from('check_in_requests')
      .insert({
        branch_id,
        full_name,
        phone,
        email: email || null,
        id_card_number,
        id_card_photo_url,
        selfie_photo_url,
        selected_room_type,
        total_amount: parseFloat(total_amount),
        payment_destination,
        payment_proof_url,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'pending'
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}

