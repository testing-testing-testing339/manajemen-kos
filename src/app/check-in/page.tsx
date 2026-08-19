'use client'

import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const CheckInForm = dynamic(() => import('./[branchId]/CheckInForm'), {
  ssr: false,
  loading: () => <LoadingSpinner size="lg" text="Memuat formulir check-in..." />,
})

export default function CheckInRootPage() {
  const [branchData, setBranchData] = useState<any>(null)

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await fetch('/api/branch/default', {
          cache: 'force-cache',
          next: { revalidate: 3600 }
        })
        if (response.ok) {
          const data = await response.json()
          setBranchData(data)
        } else {
          setBranchData({
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Graha Aisyah Menteng',
            address: 'Jl. Menteng No. 1, Jakarta Pusat'
          })
        }
      } catch {
        setBranchData({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Graha Aisyah Menteng',
          address: 'Jl. Menteng No. 1, Jakarta Pusat'
        })
      }
    }

    fetchBranch()
  }, [])

  const branch = branchData || {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Graha Aisyah Menteng',
    address: 'Jl. Menteng No. 1, Jakarta Pusat',
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mx-auto mb-4 border border-indigo-400/30">
              <span className="text-white text-2xl font-black tracking-wider">KM</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Registrasi Mandiri Tamu
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {branch.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {branch.address}
            </p>
          </div>

          <Suspense fallback={<LoadingSpinner size="lg" text="Memuat formulir..." />}>
            <CheckInForm branchId={branch.id} branchName={branch.name} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
