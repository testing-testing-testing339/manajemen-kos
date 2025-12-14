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

  // For now, return a default payment destination
  // You can add a payment_destination column to branches table later
  return NextResponse.json({
    destination: 'BCA: 1234567890 a.n. Graha Aisyah' // Default, bisa diubah nanti
  })
}

