import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> | { branchId: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params
  const branchId = resolvedParams.branchId

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  // If 'default' or not UUID, fetch the main single branch
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  let query = supabase.from('branches').select('id, name, address')
  
  if (branchId && branchId !== 'default' && uuidRegex.test(branchId)) {
    query = query.eq('id', branchId)
  }

  const { data, error } = await query.order('created_at', { ascending: true }).limit(1).single()

  if (error || !data) {
    return NextResponse.json({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Graha Aisyah Menteng',
      address: 'Jl. Menteng No. 1, Jakarta Pusat'
    })
  }

  return NextResponse.json(data)
}
