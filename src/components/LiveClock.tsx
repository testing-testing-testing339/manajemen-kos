'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'

export default function LiveClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-500 text-[11px] sm:text-xs font-medium border border-slate-200/50">
        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
        <span>Memuat...</span>
      </div>
    )
  }

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(time)

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(time)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-700 text-[11px] sm:text-xs font-medium border border-slate-200/60 shadow-2xs">
      <div className="hidden md:flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
        <span>{dateStr}</span>
      </div>
      <span className="hidden md:inline text-slate-300">•</span>
      <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold tracking-tight">
        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        <span>{timeStr} WIB</span>
      </div>
    </div>
  )
}
