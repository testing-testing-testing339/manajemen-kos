'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function NavigationLoader() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const previousPathname = useRef<string>(pathname)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset loading when pathname changes (navigation completed)
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
      
      setProgress(100)
      const t = setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 250)
      
      previousPathname.current = pathname
      return () => clearTimeout(t)
    }
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      
      if (link) {
        const href = link.getAttribute('href')
        // Only handle internal relative links
        if (href && href.startsWith('/') && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:')) {
          if (href !== pathname) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
            }
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current)
            }
            
            setIsLoading(true)
            setProgress(15)
            
            // Progressive smooth loading increments
            let currentProgress = 15
            progressIntervalRef.current = setInterval(() => {
              currentProgress += (90 - currentProgress) * 0.15
              if (currentProgress > 92) {
                currentProgress = 92
              }
              setProgress(currentProgress)
            }, 80)
            
            // Safety timeout
            loadingTimeoutRef.current = setTimeout(() => {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
              }
              setIsLoading(false)
              setProgress(0)
            }, 6000)
          }
        }
      }
    }

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

  if (!isLoading && progress === 0) return null

  return (
    <>
      {/* Top Gradient Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none">
        <div className="h-1 w-full bg-slate-900/10 backdrop-blur-xs">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-400 transition-all duration-200 ease-out shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Floating Top Right Glass Indicator */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-[99999] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/60 flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-slate-200">Memuat halaman...</span>
          </div>
        </div>
      )}
    </>
  )
}
