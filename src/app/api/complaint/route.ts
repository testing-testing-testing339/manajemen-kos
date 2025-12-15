import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  validateFullName,
  validatePhone,
  validateEmail,
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
    const body = await request.json()
    const { full_name, phone, email, room_number, title, category, priority, description } = body

    // Validate required fields
    if (!full_name || !phone || !room_number || !title || !category || !priority || !description) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    const nameValidation = validateFullName(full_name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error || 'Nama tidak valid' },
        { status: 400 }
      )
    }

    const phoneValidation = validatePhone(phone)
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Nomor telepon tidak valid' },
        { status: 400 }
      )
    }

    if (email) {
      const emailValidation = validateEmail(email)
      if (!emailValidation.valid) {
        return NextResponse.json(
          { error: emailValidation.error || 'Email tidak valid' },
          { status: 400 }
        )
      }
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(full_name)
    const sanitizedTitle = sanitizeString(title)
    const sanitizedDescription = sanitizeString(description)
    const sanitizedPhone = sanitizeString(phone)
    const sanitizedEmail = email ? sanitizeString(email) : null
    const sanitizedRoomNumber = sanitizeString(room_number)

    // Find tenant by room number and name/phone
    // First, find the room by room number
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, room_number, floor_id, floors(branch_id)')
      .eq('room_number', sanitizedRoomNumber)
      .limit(1)

    if (roomsError || !rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: 'Kamar tidak ditemukan. Pastikan nomor kamar yang Anda masukkan benar.' },
        { status: 404 }
      )
    }

    const room = rooms[0]
    const roomId = room.id

    // Find tenant in this room
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name, phone, email')
      .eq('room_id', roomId)
      .eq('full_name', sanitizedName)
      .limit(1)

    if (tenantsError) {
      console.error('Error finding tenant:', tenantsError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mencari data penyewa' },
        { status: 500 }
      )
    }

    // If tenant not found by name, try by phone
    let tenant = tenants && tenants.length > 0 ? tenants[0] : null
    
    if (!tenant) {
      const { data: tenantsByPhone } = await supabase
        .from('tenants')
        .select('id, full_name, phone, email')
        .eq('room_id', roomId)
        .eq('phone', sanitizedPhone)
        .limit(1)

      tenant = tenantsByPhone && tenantsByPhone.length > 0 ? tenantsByPhone[0] : null
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Data penyewa tidak ditemukan. Pastikan nama dan nomor kamar yang Anda masukkan sesuai dengan data yang terdaftar.' },
        { status: 404 }
      )
    }

    // Validate category and priority
    const validCategories = ['plumbing', 'electrical', 'cleaning', 'furniture', 'security', 'other']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Kategori tidak valid' },
        { status: 400 }
      )
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Prioritas tidak valid' },
        { status: 400 }
      )
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        tenant_id: tenant.id,
        room_id: roomId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        category,
        priority,
        status: 'open',
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return NextResponse.json(
        { error: 'Gagal membuat komplain. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Komplain berhasil dikirim',
        ticket_id: ticket.id
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in complaint API:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

