'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function SidebarClient({ userRole }: { userRole: string | null }) {
  const pathname = usePathname()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/properti', label: 'Properti', icon: '🏢' },
    { href: '/dashboard/penghuni', label: 'Penghuni', icon: '👥' },
    { href: '/dashboard/pembayaran', label: 'Pembayaran', icon: '💰' },
    { href: '/dashboard/check-ins', label: 'Check-in', icon: '📱' },
  ]

  // Add staff management menu only for owner
  if (userRole === 'owner') {
    menuItems.push({ href: '/dashboard/staff', label: 'Manajemen Staff', icon: '👔' })
  }

  return (
    <div className="bg-white text-gray-700 w-64 min-h-screen border-r border-gray-200 shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">GA</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Graha Aisyah</h2>
            <p className="text-xs text-gray-500">Mainframe System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gray-50 hover:transform hover:translate-x-1'
                  }`}
                >
                  <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-900 mb-1">💡 Tips</p>
          <p className="text-xs text-indigo-700">Gunakan menu di atas untuk navigasi cepat</p>
          {userRole && process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-indigo-600 mt-2 font-semibold">Role: {userRole}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(SidebarClient)

