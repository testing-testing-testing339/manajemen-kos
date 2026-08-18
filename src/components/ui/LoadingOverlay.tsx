'use client'

interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
}

export default function LoadingOverlay({ isLoading, text = 'Memproses...' }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
        <div className="relative">
          <div className="h-12 w-12 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute inset-0 h-12 w-12 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-sm font-semibold text-gray-700 animate-pulse">{text}</p>
      </div>
    </div>
  )
}




