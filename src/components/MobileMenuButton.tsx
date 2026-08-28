'use client'

import { Menu } from 'lucide-react'
import { useSidebarStore } from '@/lib/sidebarStore'

export default function MobileMenuButton() {
  const { toggleSidebar } = useSidebarStore()

  return (
    <button
      onClick={toggleSidebar}
      aria-label="Buka Menu"
      className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
