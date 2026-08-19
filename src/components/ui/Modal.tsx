'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'large' | 'xl' | '2xl' | 'full'
  className?: string
}

export default function Modal({ isOpen, onClose, children, size = 'md', className = '' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    large: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full m-4',
  }[size] || 'max-w-md'

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className={`bg-white p-6 sm:p-8 rounded-3xl ${sizeClasses} w-full text-slate-900 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto border border-slate-100 ${className}`}>
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer z-10"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  )
}