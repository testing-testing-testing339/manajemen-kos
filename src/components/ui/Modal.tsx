'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'large' | 'xl' | '2xl' | 'full'
  className?: string
}

export default function Modal({ isOpen, onClose, children, size = 'md', className = '' }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    large: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full m-4',
  }[size] || 'max-w-md'

  const modalContent = (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Click backdrop to close */}
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose} 
      />

      <div className={`bg-white p-5 sm:p-8 rounded-3xl ${sizeClasses} w-full text-slate-900 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto border border-slate-100 ${className} animate-in zoom-in-95 duration-200`}>
        <button 
          onClick={onClose} 
          aria-label="Tutup popup"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer z-20"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}