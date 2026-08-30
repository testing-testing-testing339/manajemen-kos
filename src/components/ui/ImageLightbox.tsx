'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, ZoomIn } from 'lucide-react'

interface ImageLightboxProps {
  isOpen: boolean
  url: string | null | undefined
  title?: string
  onClose: () => void
}

export default function ImageLightbox({ isOpen, url, title = 'Foto Preview', onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !url || !mounted) return null

  const content = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2 min-w-0 pr-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <ZoomIn className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
              title="Buka gambar di tab baru dengan ukuran asli"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Tab Baru</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              aria-label="Tutup preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Image View */}
        <div className="p-3 sm:p-6 flex items-center justify-center bg-slate-950/50 overflow-auto max-h-[calc(92vh-64px)]">
          <img
            src={url}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80"
          />
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
