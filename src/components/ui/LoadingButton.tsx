'use client'

import { useState } from 'react'

interface LoadingButtonProps {
  children: React.ReactNode
  onClick?: () => void | Promise<void>
  className?: string
  disabled?: boolean
  loadingText?: string
  variant?: 'primary' | 'danger' | 'success' | 'warning' | 'default'
  type?: 'button' | 'submit'
}

export default function LoadingButton({ 
  children, 
  onClick,
  className = '', 
  disabled = false,
  loadingText,
  variant = 'default',
  type = 'button'
}: LoadingButtonProps) {
  const [loading, setLoading] = useState(false)
  const isDisabled = loading || disabled

  const handleClick = async () => {
    if (onClick && !isDisabled) {
      setLoading(true)
      try {
        await onClick()
      } finally {
        setLoading(false)
      }
    }
  }

  const baseStyles = 'px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 active:scale-95'
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl',
    warning: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 shadow-lg hover:shadow-xl',
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText || 'Memproses...'}
        </span>
      ) : (
        children
      )}
    </button>
  )
}




