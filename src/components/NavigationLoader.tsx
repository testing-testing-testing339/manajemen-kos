'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import LoadingSpinner from './ui/LoadingSpinner'

export default function NavigationLoader() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)

  useEffect(() => {
    // Reset loading when pathname changes
    const timer = setTimeout(() => {
      setIsLoading(false)
      setLoadingPath(null)
    }, 100)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      
      if (link) {
        const href = link.getAttribute('href')
        if (href && href.startsWith('/') && !href.startsWith('#') && !href.startsWith('http')) {
          // Check if it's a different route
          if (href !== pathname) {
            setIsLoading(true)
            setLoadingPath(href)
          }
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg animate-slideDown">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <div className="h-5 w-5 border-2 border-white/30 rounded-full"></div>
          <div className="absolute inset-0 h-5 w-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Memuat halaman...</p>
          {loadingPath && (
            <p className="text-xs text-indigo-100 opacity-90">{loadingPath}</p>
          )}
        </div>
      </div>
    </div>
  )
}

