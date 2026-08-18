'use client'

import { useActionState, useState, useRef } from 'react'
import { login } from './actions'
import SubmitButton from '@/components/ui/SubmitButton'
import { Building2, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Client-side validation for email
  const validateEmailInput = (value: string) => {
    setEmailError('')
    if (!value) return
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError('Format email tidak valid')
      return
    }
    
    if (/[<>'"&]/.test(value) || /javascript:/gi.test(value) || /on\w+=/gi.test(value)) {
      setEmailError('Email mengandung karakter tidak valid')
      return
    }
  }

  // Client-side validation for password
  const validatePasswordInput = (value: string) => {
    setPasswordError('')
    if (!value) return
    
    if (value.length < 6) {
      setPasswordError('Password harus minimal 6 karakter')
      return
    }
    
    if (/[<>'"&]/.test(value) || /javascript:/gi.test(value) || /on\w+=/gi.test(value)) {
      setPasswordError('Password mengandung karakter tidak valid')
      return
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-900 overflow-hidden">
      {/* Dynamic ambient gradient background */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 transition-all duration-300">
          {/* Brand Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-50">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Graha Aisyah
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mainframe System
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Masuk ke akun administrator & staff kos
            </p>
          </div>

          {/* Error Message */}
          {state?.error && (
            <div className="mb-6 p-4 bg-red-50/90 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <p className="text-sm font-medium">{state.error}</p>
            </div>
          )}

          {/* Login Form */}
          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                  onChange={(e) => validateEmailInput(e.target.value)}
                  onBlur={(e) => validateEmailInput(e.target.value)}
                  className={`block w-full pl-10 pr-3.5 py-3 bg-slate-50/80 text-slate-900 placeholder-slate-400 rounded-xl border text-sm font-medium transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    emailError ? 'border-red-500 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
              </div>
              {emailError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{emailError}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => validatePasswordInput(e.target.value)}
                  onBlur={(e) => validatePasswordInput(e.target.value)}
                  className={`block w-full pl-10 pr-11 py-3 bg-slate-50/80 text-slate-900 placeholder-slate-400 rounded-xl border text-sm font-medium transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    passwordError ? 'border-red-500 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{passwordError}</p>
              )}
            </div>

            <div className="pt-2">
              <SubmitButton
                variant="primary"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                loadingText="Memverifikasi..."
              >
                Masuk ke Dashboard
              </SubmitButton>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Graha Aisyah Kos Management. Secure Cloud Access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
