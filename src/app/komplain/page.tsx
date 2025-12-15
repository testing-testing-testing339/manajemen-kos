'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const PublicComplaintForm = dynamic(
  () => import('./PublicComplaintForm'),
  {
    ssr: false,
    loading: () => <LoadingSpinner size="lg" text="Memuat formulir..." />
  }
)

export default function PublicComplaintPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white text-2xl font-bold">GA</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Formulir Komplain</h1>
          <p className="text-gray-600">Laporkan masalah dengan kamar atau fasilitas Anda</p>
        </div>
        
        <Suspense fallback={<LoadingSpinner size="lg" text="Memuat formulir..." />}>
          <PublicComplaintForm />
        </Suspense>
      </div>
    </div>
  )
}

