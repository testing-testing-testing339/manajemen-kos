import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  validateFullName,
  validatePhone,
  validateEmail,
  sanitizeString
} from '@/lib/validation'

export async function POST(request: Request) {
  // Use service role key to bypass RLS for complaint API
  // This is needed because we need to read ALL rooms (including occupied) and tenants
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
    return NextResponse.json(
      { error: 'Konfigurasi server tidak lengkap. Silakan hubungi administrator.' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Format data tidak valid. Silakan coba lagi.' },
        { status: 400 }
      )
    }
    
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
    // Normalize room number input
    const normalizedRoomNumber = sanitizedRoomNumber.trim()
    
    // Step 1: If branch_id provided, get floors in that branch first
    let floorIds: string[] = []
    if (branch_id) {
      const { data: floors, error: floorsError } = await supabaseAdmin
        .from('floors')
        .select('id')
        .eq('branch_id', branch_id)
      
      if (floorsError) {
        console.error('Error finding floors:', floorsError)
        return NextResponse.json(
          { error: 'Terjadi kesalahan saat mencari data cabang. Silakan coba lagi.' },
          { status: 500 }
        )
      }
      
      if (!floors || floors.length === 0) {
        return NextResponse.json(
          { error: 'Cabang tidak memiliki lantai. Silakan hubungi administrator.' },
          { status: 404 }
        )
      }
      
      floorIds = floors.map((f: any) => f.id)
    }
    
    // Step 2: Get ALL rooms (including occupied) - filter by floor_ids if branch_id provided
    // We need ALL rooms because we're looking for tenants who might be in occupied rooms
    let roomsQuery = supabaseAdmin
      .from('rooms')
      .select('id, room_number, floor_id')
    
    if (branch_id && floorIds.length > 0) {
      roomsQuery = roomsQuery.in('floor_id', floorIds)
    }
    
    const { data: allRooms, error: roomsError } = await roomsQuery
    
    if (roomsError) {
      console.error('Error finding room:', roomsError)
      console.error('Room error details:', JSON.stringify(roomsError, null, 2))
      return NextResponse.json(
        { error: `Terjadi kesalahan saat mencari kamar: ${roomsError.message || 'Unknown error'}. Silakan coba lagi.` },
        { status: 500 }
      )
    }

    if (!allRooms || allRooms.length === 0) {
      if (branch_id) {
        return NextResponse.json(
          { error: 'Tidak ada kamar yang terdaftar di cabang ini.' },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { error: 'Tidak ada kamar yang terdaftar di sistem.' },
          { status: 404 }
        )
      }
    }

    // Debug: Log all room numbers found (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('All rooms found:', allRooms.map((r: any) => r.room_number))
      console.log('Searching for room number:', normalizedRoomNumber)
    }

    // Step 3: Filter by room number with flexible matching
    const matchingRooms = allRooms.filter((r: any) => {
      const dbRoomNumber = String(r.room_number || '').trim()
      const inputRoomNumber = normalizedRoomNumber.trim()
      
      // Exact match (case-sensitive)
      if (dbRoomNumber === inputRoomNumber) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Exact match found: "${dbRoomNumber}" === "${inputRoomNumber}"`)
        }
        return true
      }
      
      // Case-insensitive match
      if (dbRoomNumber.toLowerCase() === inputRoomNumber.toLowerCase()) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Case-insensitive match found: "${dbRoomNumber}" === "${inputRoomNumber}"`)
        }
        return true
      }
      
      // Numeric match (handle "2" vs "02" vs "002")
      const dbNum = parseInt(dbRoomNumber, 10)
      const inputNum = parseInt(inputRoomNumber, 10)
      if (!isNaN(dbNum) && !isNaN(inputNum) && dbNum > 0 && inputNum > 0) {
        if (dbNum === inputNum) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Numeric match found: ${dbNum} === ${inputNum}`)
          }
          return true
        }
      }
      
      return false
    })

    if (matchingRooms.length === 0) {
      // Debug: Log available room numbers for better error message
      const availableRooms = allRooms.map((r: any) => r.room_number).join(', ')
      if (process.env.NODE_ENV === 'development') {
        console.log('Available room numbers:', availableRooms)
      }
      
      if (branch_id) {
        return NextResponse.json(
          { error: `Kamar nomor "${sanitizedRoomNumber}" tidak ditemukan di cabang ini. Pastikan nomor kamar yang Anda masukkan benar.` },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { error: `Kamar nomor "${sanitizedRoomNumber}" tidak ditemukan. Pastikan nomor kamar yang Anda masukkan benar.` },
          { status: 404 }
        )
      }
    }

    // Use the first matching room
    const room = matchingRooms[0]
    const roomId = room.id

    // Skip tenant validation - create ticket directly with room_id
    // tenant_id will be null if tenant not found, which is acceptable
    let tenantId = null
    
    // Try to find tenant in this room (optional - don't fail if not found)
    try {
      const { data: allTenantsInRoom } = await supabaseAdmin
        .from('tenants')
        .select('id, full_name')
        .eq('room_id', roomId)

      if (allTenantsInRoom && allTenantsInRoom.length > 0) {
        // Try to find tenant by name (case insensitive)
        const tenant = allTenantsInRoom.find((t: any) => 
          t.full_name.toLowerCase().trim() === sanitizedName.toLowerCase().trim()
        )
        
        if (tenant) {
          tenantId = tenant.id
        }
      }
    } catch (tenantError) {
      // Ignore tenant lookup errors - we'll create ticket without tenant_id
      console.log('Tenant lookup skipped:', tenantError)
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

    // Create ticket - tenant_id is optional (can be null)
    const ticketData: any = {
      room_id: roomId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category,
      priority,
      status: 'open',
    }
    
    // Only add tenant_id if we found a matching tenant
    if (tenantId) {
      ticketData.tenant_id = tenantId
    }
    
    // Log ticket data before insert (for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating ticket with data:', JSON.stringify(ticketData, null, 2))
    }
    
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      console.error('Ticket error details:', JSON.stringify(ticketError, null, 2))
      console.error('Ticket data attempted:', JSON.stringify(ticketData, null, 2))
      
      // Return more detailed error message
      const errorMessage = ticketError.message || 'Unknown error'
      const errorCode = ticketError.code || 'UNKNOWN'
      
      return NextResponse.json(
        { 
          error: `Gagal membuat komplain: ${errorMessage} (${errorCode}). Silakan coba lagi atau hubungi administrator.`,
          details: process.env.NODE_ENV === 'development' ? ticketError : undefined
        },
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
    console.error('Error stack:', error?.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    
    // Check if it's a service role key issue
    if (error?.message?.includes('JWT') || error?.message?.includes('token') || error?.message?.includes('key')) {
      return NextResponse.json(
        { 
          error: 'Konfigurasi server tidak lengkap. Service role key tidak valid atau tidak ditemukan. Silakan hubungi administrator.',
          hint: 'Pastikan SUPABASE_SERVICE_ROLE_KEY sudah ditambahkan di environment variables Vercel.'
        },
        { status: 500 }
      )
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Terjadi kesalahan server: ${error?.message || 'Unknown error'}. Silakan coba lagi.`
      : 'Terjadi kesalahan server. Silakan coba lagi atau hubungi administrator.'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        } : undefined
      },
      { status: 500 }
    )
  }
}

