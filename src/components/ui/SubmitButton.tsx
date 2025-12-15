'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  loadingText?: string
  variant?: 'primary' | 'danger' | 'success' | 'warning'
}

export default function SubmitButton({ 
  children, 
  className = '', 
  disabled = false,
  loadingText,
  variant = 'primary'
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled

  const baseStyles = 'px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 active:scale-95'
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl',
    warning: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 shadow-lg hover:shadow-xl'
  }

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <div className="relative">
            <div className="h-4 w-4 border-2 border-current border-opacity-25 rounded-full"></div>
            <div className="absolute inset-0 h-4 w-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
          </div>
          <span className="animate-pulse">{loadingText || 'Memproses...'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}

