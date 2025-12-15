'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationLoader() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const previousPathname = useRef<string>(pathname)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset loading when pathname changes
  useEffect(() => {
    // If pathname changed, we've navigated - hide loader
    if (previousPathname.current !== pathname) {
      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
      
      // Complete progress and hide
      setProgress(100)
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 200)
      
      previousPathname.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      
      if (link) {
        const href = link.getAttribute('href')
        // Only handle internal links
        if (href && href.startsWith('/') && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:')) {
          // Check if it's a different route
          if (href !== pathname) {
            // Clear any existing timeouts/intervals
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
            }
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current)
            }
            
            // Show loading immediately
            setIsLoading(true)
            setProgress(0)
            
            // Simulate progress
            let currentProgress = 0
            progressIntervalRef.current = setInterval(() => {
              currentProgress += Math.random() * 15
              if (currentProgress > 90) {
                currentProgress = 90 // Don't complete until navigation finishes
              }
              setProgress(currentProgress)
            }, 100)
            
            // Safety timeout - hide after 5 seconds max
            loadingTimeoutRef.current = setTimeout(() => {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
              }
              setIsLoading(false)
              setProgress(0)
            }, 5000)
          }
        }
      }
    }

    // Use capture phase to catch events early, before Next.js handles them
    document.addEventListener('click', handleClick, true)
    
    return () => {
      document.removeEventListener('click', handleClick, true)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="h-1 bg-white/20 relative overflow-hidden">
        <div 
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="relative">
          <div className="h-4 w-4 border-2 border-white/30 rounded-full"></div>
          <div className="absolute inset-0 h-4 w-4 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-xs font-semibold">Memuat halaman...</p>
      </div>
    </div>
  )
}

