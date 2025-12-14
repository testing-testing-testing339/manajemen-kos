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

  const { data, error } = await supabase
    .from('branches')
    .select('id, name, address')
    .eq('id', branchId)
    .single()

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching branch:', error)
    }
    return NextResponse.json({ error: error.message || 'Branch not found' }, { status: 404 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

