'use client'

import { useEffect, useState } from 'react'

import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react'

interface NotificationProps {
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  onClose?: () => void
}

export default function Notification({
  title,
  message,
  type = 'info',
  duration = 5000,
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onClose?.()
      }, 300) // Wait for animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeStyles = {
    info: 'bg-slate-900 border-indigo-500 text-white',
    success: 'bg-slate-900 border-emerald-500 text-white',
    warning: 'bg-slate-900 border-amber-500 text-white',
    error: 'bg-slate-900 border-rose-500 text-white',
  }

  const iconColors = {
    info: 'text-indigo-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-rose-400',
  }

  return (
    <div
      className={`fixed top-4 right-4 z-[10000] min-w-[320px] max-w-md p-4 rounded-2xl shadow-2xl border-2 ${
        typeStyles[type]
      } transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColors[type]}`}>
          {type === 'info' && <Info className="w-5 h-5" />}
          {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {type === 'error' && <AlertCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-0.5">{title}</h3>
          <p className="text-xs opacity-85 text-slate-300">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}




