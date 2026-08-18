import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Mencegah caching agar query selalu menyentuh database
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ success: false, message: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Lakukan query nyata ke database untuk mencegah auto-pause
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .limit(1)

    if (error) {
      // Jika tabel branches kosong/ada RLS, coba query data lain
      const { error: error2 } = await supabase.from('profiles').select('id').limit(1)
      if (error2) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Supabase ping query executed successfully (Database kept alive)'
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
