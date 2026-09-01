import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> | { branchId: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params
  const branchId = resolvedParams.branchId

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // If 'default' or not valid UUID, fetch the main single branch
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isDummyUuid = branchId === '00000000-0000-0000-0000-000000000001'
  
  let query = supabase.from('branches').select('id, name, address')
  
  if (branchId && branchId !== 'default' && !isDummyUuid && uuidRegex.test(branchId)) {
    query = query.eq('id', branchId)
  }

  let { data } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!data) {
    // If branches table is empty, auto-create the main branch
    const { data: createdBranch } = await supabase
      .from('branches')
      .insert({
        name: 'Graha Aisyah Menteng',
        address: 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'
      })
      .select('id, name, address')
      .maybeSingle()
    
    if (createdBranch) {
      data = createdBranch
    }
  }

  return NextResponse.json(data || {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Graha Aisyah Menteng',
    address: 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'
  })
}
