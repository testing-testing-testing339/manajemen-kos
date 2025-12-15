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
    const { full_name, phone, email, room_number, title, category, priority, description, branch_id } = body

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
        { error: 'Nama tidak valid. Nama harus 2-100 karakter dan hanya boleh huruf, spasi, titik, tanda hubung, atau apostrof.' },
        { status: 400 }
      )
    }

    const phoneValidation = validatePhone(phone)
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak valid. Gunakan format nomor Indonesia (08xx atau +628xx).' },
        { status: 400 }
      )
    }

    if (email) {
      const emailValidation = validateEmail(email)
      if (!emailValidation.valid) {
        return NextResponse.json(
          { error: 'Email tidak valid. Pastikan format email benar (contoh: email@example.com).' },
          { status: 400 }
        )
      }
    }

    // Use sanitized values from validation
    const sanitizedName = nameValidation.sanitized
    const sanitizedTitle = sanitizeString(title)
    const sanitizedDescription = sanitizeString(description)
    const sanitizedPhone = phoneValidation.sanitized
    const sanitizedEmail = email ? validateEmail(email).sanitized : null
    const sanitizedRoomNumber = sanitizeString(room_number)

    // Find tenant by room number and name/phone
    // First, find the room by room number (case-insensitive, trim whitespace)
    // room_number is text, so we need to handle it carefully
    const normalizedRoomNumber = sanitizedRoomNumber.trim()
    
    // Get all rooms and filter client-side for more flexibility
    // This handles cases where room_number might have different formats
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, room_number, floor_id')
    
    if (roomsError) {
      console.error('Error finding room:', roomsError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mencari kamar. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    if (!allRooms || allRooms.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada kamar yang terdaftar di sistem.' },
        { status: 404 }
      )
    }

    // If branch_id provided, filter rooms by branch FIRST
    let roomsToSearch = allRooms
    if (branch_id) {
      // Get floors in the branch
      const { data: floors } = await supabase
        .from('floors')
        .select('id')
        .eq('branch_id', branch_id)
      
      if (floors && floors.length > 0) {
        const floorIds = floors.map((f: any) => f.id)
        roomsToSearch = allRooms.filter((r: any) => floorIds.includes(r.floor_id))
      } else {
        roomsToSearch = []
      }
    }

    // Filter rooms by room number (flexible matching) from filtered rooms
    let rooms = roomsToSearch.filter((r: any) => {
      const dbRoomNumber = r.room_number?.toString().trim()
      const inputRoomNumber = normalizedRoomNumber.trim()
      
      // Try exact match
      if (dbRoomNumber === inputRoomNumber) return true
      
      // Try case-insensitive
      if (dbRoomNumber?.toLowerCase() === inputRoomNumber.toLowerCase()) return true
      
      // Try numeric comparison (in case one is "1" and other is "01" or "2" vs "02")
      const dbNum = parseInt(dbRoomNumber || '0')
      const inputNum = parseInt(inputRoomNumber || '0')
      if (dbNum > 0 && inputNum > 0 && dbNum === inputNum) {
        // Match if both are valid numbers and represent the same number
        return true
      }
      
      return false
    })

    if (rooms.length === 0) {
      // More helpful error message
      if (branch_id) {
        return NextResponse.json(
          { error: `Kamar dengan nomor "${sanitizedRoomNumber}" tidak ditemukan di cabang ini. Pastikan nomor kamar yang Anda masukkan benar.` },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { error: `Kamar dengan nomor "${sanitizedRoomNumber}" tidak ditemukan. Pastikan nomor kamar yang Anda masukkan benar dan sesuai dengan data yang terdaftar.` },
          { status: 404 }
        )
      }
    }

    const room = rooms[0]
    const roomId = room.id

    // Find tenant in this room - try by name first (case insensitive)
    const { data: allTenantsInRoom } = await supabase
      .from('tenants')
      .select('id, full_name, phone, email')
      .eq('room_id', roomId)

    if (!allTenantsInRoom) {
      console.error('Error: allTenantsInRoom is null')
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mencari data penyewa. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    // Try to find tenant by name (case insensitive)
    let tenant = allTenantsInRoom.find((t: any) => 
      t.full_name.toLowerCase().trim() === sanitizedName.toLowerCase().trim()
    )
    
    // If not found by name, try by phone
    if (!tenant) {
      tenant = allTenantsInRoom.find((t: any) => {
        // Normalize phone numbers for comparison
        const tenantPhone = t.phone?.replace(/[^\d]/g, '')
        const inputPhone = sanitizedPhone.replace(/[^\d]/g, '')
        return tenantPhone === inputPhone
      })
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

