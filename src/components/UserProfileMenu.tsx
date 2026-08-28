'use client'

import { useState, useActionState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { 
  User, 
  KeyRound, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Edit3,
  X,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { updateProfileName, updateProfilePhoto, changePassword } from '@/app/dashboard/actions/profileActions'
import { compressImage } from '@/lib/imageCompressor'

interface UserProfileMenuProps {
  user: {
    id: string
    email?: string
  }
  profile: {
    full_name?: string | null
    role?: string | null
    photo_url?: string | null
  } | null
  logoutAction: () => Promise<void>
}

export default function UserProfileMenu({ user, profile, logoutAction }: UserProfileMenuProps) {
  const [isOpenDropdown, setIsOpenDropdown] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Current display data
  const [currentName, setCurrentName] = useState(profile?.full_name || user.email?.split('@')[0] || 'User')
  const [currentPhoto, setCurrentPhoto] = useState(profile?.photo_url || '')
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  // Password visibility state
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form action states
  const [nameState, nameAction, isNamePending] = useActionState(updateProfileName, null)
  const [photoState, photoAction, isPhotoPending] = useActionState(updateProfilePhoto, null)
  const [passState, passAction, isPassPending] = useActionState(changePassword, null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync state on success
  useEffect(() => {
    if (nameState?.success) {
      // Name updated
    }
  }, [nameState])

  useEffect(() => {
    if (photoState?.success && photoState.photoUrl) {
      setCurrentPhoto(photoState.photoUrl)
      setPreviewPhoto(null)
      setCompressedFile(null)
    }
  }, [photoState])

  const initials = currentName.substring(0, 2).toUpperCase()

  // Handle Photo selection with WebP compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const optimized = await compressImage(file, {
        maxDimension: 800,
        quality: 0.85,
        targetFormat: 'image/webp'
      })
      setCompressedFile(optimized)
      setPreviewPhoto(URL.createObjectURL(optimized))
    } catch (err) {
      setCompressedFile(file)
      setPreviewPhoto(URL.createObjectURL(file))
    } finally {
      setIsCompressing(false)
    }
  }

  return (
    <>
      {/* Profile Trigger Button in Header */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpenDropdown(!isOpenDropdown)}
          className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200/80 hover:bg-slate-50/80 p-1 sm:p-1.5 rounded-2xl transition-all cursor-pointer group"
          title="Pengaturan Akun"
        >
          {/* Avatar Container */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-indigo-500/20 flex-shrink-0 relative border border-white/40 group-hover:scale-105 transition-transform">
            {currentPhoto ? (
              <img 
                src={currentPhoto} 
                alt={currentName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="hidden md:block text-left">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-slate-800 leading-tight max-w-[130px] truncate">
                {currentName}
              </p>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpenDropdown ? 'rotate-180 text-indigo-600' : ''}`} />
            </div>
            <p className="text-[11px] text-indigo-600 font-medium capitalize flex items-center gap-1">
              <span>{profile?.role || 'Staff'}</span>
            </p>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpenDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header in Dropdown */}
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">{currentName}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="p-1 space-y-0.5">
              <button
                onClick={() => {
                  setActiveTab('profile')
                  setIsModalOpen(true)
                  setIsOpenDropdown(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-indigo-500" />
                <span>Ganti Nama & Foto</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('password')
                  setIsModalOpen(true)
                  setIsOpenDropdown(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-purple-500" />
                <span>Ganti Password</span>
              </button>
            </div>

            {/* Logout Divider */}
            <div className="p-1 border-t border-slate-100">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Keluar</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <div className="space-y-5">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Pengaturan Akun</h2>
                <p className="text-xs text-slate-400">Kelola informasi profil dan keamanan akun Anda</p>
              </div>
            </div>
          </div>

          {/* Modal Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profil & Foto</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ganti Password</span>
            </button>
          </div>

          {/* TAB 1: PROFIL & FOTO */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Photo Upload Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                <label className="block text-xs font-bold text-slate-800">Foto Profil (Avatar)</label>
                
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-black border-2 border-white shadow-md flex-shrink-0">
                    {previewPhoto || currentPhoto ? (
                      <img 
                        src={previewPhoto || currentPhoto} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}

                    {isCompressing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white">
                        Proses...
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 rounded-xl cursor-pointer transition-colors shadow-2xs">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pilih Foto Baru</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoSelect} 
                        className="hidden" 
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, atau WebP (otomatis dikompresi)
                    </p>
                  </div>
                </div>

                {/* Submit Photo Form */}
                {compressedFile && (
                  <form action={photoAction} className="pt-2 border-t border-slate-200/80">
                    <input type="hidden" name="photo" value="" />
                    <button
                      type="submit"
                      disabled={isPhotoPending}
                      onClick={(e) => {
                        e.preventDefault()
                        const formData = new FormData()
                        formData.append('photo', compressedFile)
                        photoAction(formData)
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isPhotoPending ? 'Mengunggah Foto...' : 'Simpan Foto Profil Ini'}
                    </button>
                  </form>
                )}

                {photoState?.success && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{photoState.message}</span>
                  </div>
                )}

                {photoState?.error && (
                  <div className="p-2.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{photoState.error}</span>
                  </div>
                )}
              </div>

              {/* Update Name Form */}
              <form action={nameAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    defaultValue={currentName}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email (Akun)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                {nameState?.success && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{nameState.message}</span>
                  </div>
                )}

                {nameState?.error && (
                  <div className="p-2.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{nameState.error}</span>
                  </div>
                )}

                <div className="pt-2">
                  <SubmitButton 
                    loadingText="Menyimpan Nama..." 
                    className="w-full text-xs"
                  >
                    Simpan Perubahan Nama
                  </SubmitButton>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: GANTI PASSWORD */}
          {activeTab === 'password' && (
            <form action={passAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="new_password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    required
                    minLength={6}
                    placeholder="Ulangi password baru..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passState?.success && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{passState.message}</span>
                </div>
              )}

              {passState?.error && (
                <div className="p-2.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{passState.error}</span>
                </div>
              )}

              <div className="pt-2">
                <SubmitButton 
                  loadingText="Mengubah Password..." 
                  className="w-full text-xs"
                >
                  Update Password Akun
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  )
}
