'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Dynamic import untuk form
const CheckInForm = dynamic(() => import('./CheckInForm'), {
  ssr: false,
  loading: () => <LoadingSpinner size="lg" text="Memuat formulir check-in..." />,
})

function CheckInPageContent() {
  const params = useParams()
  const branchId = params?.branchId as string | undefined
  const [branchData, setBranchData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If no branchId or default, fetch the main branch
    const fetchBranch = async () => {
      try {
        const idToFetch = (branchId && branchId !== 'undefined') ? branchId : 'default'
        const response = await fetch(`/api/branch/${idToFetch}`, {
          cache: 'force-cache',
          next: { revalidate: 3600 }
        })
        if (response.ok) {
          const data = await response.json()
          setBranchData(data)
          setError(null)
        } else {
          // Fallback to Jl. Menteng
          setBranchData({
            id: branchId || '00000000-0000-0000-0000-000000000001',
            name: 'Graha Aisyah Menteng',
            address: 'Jl. Menteng No. 1, Jakarta Pusat'
          })
          setError(null)
        }
      } catch (err: any) {
        setBranchData({
          id: branchId || '00000000-0000-0000-0000-000000000001',
          name: 'Graha Aisyah Menteng',
          address: 'Jl. Menteng No. 1, Jakarta Pusat'
        })
      }
    }

    fetchBranch()
  }, [branchId])

  if (!branchData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner size="lg" text="Menghubungkan ke Graha Aisyah Menteng..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center items-center">
      {/* Ambient background glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto relative z-10">
        <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Formulir Checkin {branchData.name || 'Graha Aisyah Menteng'}
            </h1>
          </div>

          <Suspense fallback={<LoadingSpinner size="lg" text="Memuat formulir..." />}>
            <CheckInForm branchId={branchData.id || branchId!} branchName={branchData.name || 'Graha Aisyah Menteng'} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckInPageContent />
    </Suspense>
  )
}
