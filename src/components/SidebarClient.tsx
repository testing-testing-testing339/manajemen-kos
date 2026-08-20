'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  UserCheck, 
  QrCode, 
  ShieldCheck, 
  Zap,
  ChevronRight
} from 'lucide-react'

function SidebarClient({ 
  userRole, 
  initialPendingCheckInsCount = 0 
}: { 
  userRole: string | null
  initialPendingCheckInsCount?: number
}) {
  const pathname = usePathname()
  const [pendingCheckInsCount, setPendingCheckInsCount] = useState(initialPendingCheckInsCount)

  // Listen for real-time check-in updates
  useEffect(() => {
    setPendingCheckInsCount(initialPendingCheckInsCount)
    
    const handleCheckInUpdate = () => {
      setPendingCheckInsCount((prev) => prev + 1)
    }

    window.addEventListener('checkin-updated', handleCheckInUpdate)
    return () => {
      window.removeEventListener('checkin-updated', handleCheckInUpdate)
    }
  }, [initialPendingCheckInsCount])

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/properti', label: 'Properti & Kamar', icon: Building2 },
    { href: '/dashboard/penghuni', label: 'Penghuni', icon: Users },
    { href: '/dashboard/pembayaran', label: 'Pembayaran', icon: CreditCard },
    { 
      href: '/dashboard/check-ins', 
      label: 'Permintaan Check-in', 
      icon: UserCheck, 
      badge: (userRole === 'owner' || userRole === 'staff') ? pendingCheckInsCount : undefined 
    },
  ]

  if (userRole === 'owner' || userRole === 'staff') {
    menuItems.push({ href: '/dashboard/qr-generator', label: 'QR Check-in', icon: QrCode, badge: undefined })
  }

  if (userRole === 'owner') {
    menuItems.push({ href: '/dashboard/pln', label: 'ID Meteran PLN', icon: Zap, badge: undefined })
    menuItems.push({ href: '/dashboard/staff', label: 'Manajemen Staff', icon: ShieldCheck, badge: undefined })
  }

  return (
    <aside className="bg-white text-slate-700 w-64 min-h-screen border-r border-slate-200/80 shadow-xs flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-snug tracking-tight">
              Graha Aisyah Menteng
            </h2>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3.5 space-y-1">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] text-center shadow-xs animate-bounce">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto text-white/80 flex-shrink-0" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* System Badge */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl p-3.5 border border-indigo-100/80">
          <p className="text-xs font-bold text-indigo-950">Sistem Manajemen</p>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
            Build By KV
          </p>
          {userRole && (
            <div className="mt-2.5 pt-2 border-t border-indigo-100/60 flex items-center justify-between">
              <span className="text-[10px] text-indigo-500 font-medium uppercase">Role</span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full capitalize">
                {userRole}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default memo(SidebarClient)

