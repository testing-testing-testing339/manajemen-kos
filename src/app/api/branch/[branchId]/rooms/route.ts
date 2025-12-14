import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> | { branchId: string } }
) {
  // Handle both Next.js 15+ (Promise) and older versions
  const resolvedParams = params instanceof Promise ? await params : params
  const branchId = resolvedParams.branchId

  if (!branchId) {
    return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(branchId)) {
    return NextResponse.json({ error: 'Invalid Branch ID format' }, { status: 400 })
  }

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

  // Get floors in this branch
  const { data: floors, error: floorsError } = await supabase
    .from('floors')
    .select('id')
    .eq('branch_id', branchId)

  if (floorsError) {
    console.error('Error fetching floors:', floorsError)
    return NextResponse.json({ error: floorsError.message }, { status: 500 })
  }

  if (!floors || floors.length === 0) {
    return NextResponse.json([])
  }

  const floorIds = floors.map(f => f.id)

  // Get available rooms (not occupied) in those floors
  // Note: RLS policy should allow anon users to read rooms where is_occupied = false
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, room_number, price, price_per_day, price_per_month, price_per_6months, facilities, is_occupied')
    .in('floor_id', floorIds)
    .eq('is_occupied', false)

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError)
    return NextResponse.json({ error: roomsError.message }, { status: 500 })
  }

  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Found ${rooms?.length || 0} available rooms for branch ${branchId}`)
  }

  return NextResponse.json(rooms || [])
}

