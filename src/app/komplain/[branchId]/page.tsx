'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const PublicComplaintForm = dynamic(
  () => import('../PublicComplaintForm'),
  {
    ssr: false,
    loading: () => <LoadingSpinner size="lg" text="Memuat formulir..." />
  }
)

export default function ComplaintPageWithBranch() {
  const params = useParams()
  const branchId = params?.branchId as string | undefined
  const [branchData, setBranchData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!branchId || branchId === 'undefined') {
      setError('Branch ID tidak ditemukan')
      return
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(branchId)) {
      setError(`Format Branch ID tidak valid: ${branchId}`)
      return
    }

    // Fetch branch data
    const fetchBranch = async () => {
      try {
        const response = await fetch(`/api/branch/${branchId}`, {
          cache: 'force-cache',
          next: { revalidate: 3600 }
        })
        if (response.ok) {
          const data = await response.json()
          setBranchData(data)
          setError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Branch not found' }))
          setError(errorData.error || 'Cabang tidak ditemukan')
        }
      } catch (error: any) {
        setError('Terjadi kesalahan saat memuat data cabang')
      }
    }

    fetchBranch()
  }, [branchId])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white text-2xl font-bold">GA</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Formulir Komplain</h1>
          {branchData ? (
            <>
              <p className="text-gray-600">{branchData.name}</p>
              <p className="text-sm text-gray-500 mt-2">{branchData.address}</p>
            </>
          ) : (
            <LoadingSpinner size="md" text="Memuat data cabang..." />
          )}
        </div>
        
        {branchData && (
          <Suspense fallback={<LoadingSpinner size="lg" text="Memuat formulir..." />}>
            <PublicComplaintForm branchId={branchId} branchName={branchData.name} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

