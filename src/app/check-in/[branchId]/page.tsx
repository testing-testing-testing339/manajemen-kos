'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CheckInForm from './CheckInForm'

export default function CheckInPage() {
  const params = useParams()
  const branchId = params?.branchId as string | undefined
  const [branchData, setBranchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch branch data
    const fetchBranch = async () => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Branch ID from params:', branchId)
        console.log('All params:', params)
      }

      if (!branchId || branchId === 'undefined') {
        setError('Branch ID tidak ditemukan di URL')
        setLoading(false)
        return
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(branchId)) {
        setError(`Format Branch ID tidak valid: ${branchId}`)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/branch/${branchId}`)
        if (response.ok) {
          const data = await response.json()
          setBranchData(data)
          setError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Branch not found' }))
          setError(errorData.error || 'Cabang tidak ditemukan')
          console.error('Error fetching branch:', errorData.error)
        }
      } catch (error: any) {
        setError('Terjadi kesalahan saat memuat data cabang')
        console.error('Error fetching branch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBranch()
  }, [branchId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat halaman...</p>
        </div>
      </div>
    )
  }

  if (error || !branchData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 text-lg font-semibold mb-2">Cabang tidak ditemukan</p>
          <p className="text-gray-600 text-sm mb-4">{error || 'URL yang Anda akses tidak valid'}</p>
          {branchId && (
            <p className="text-xs text-gray-500">Branch ID: {branchId}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
              <span className="text-white text-2xl font-bold">GA</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check-in Kost</h1>
            <p className="text-gray-600">{branchData.name}</p>
            <p className="text-sm text-gray-500 mt-2">{branchData.address}</p>
          </div>
          
          <CheckInForm branchId={branchId} branchName={branchData.name} />
        </div>
      </div>
    </div>
  )
}

