import Link from 'next/link'
import { ShieldAlert, ArrowLeft, Building2 } from 'lucide-react'

export default function Forbidden({ 
  title = 'Akses Terbatas (Khusus Owner)',
  message = 'Halaman ini hanya dapat diakses oleh akun Pemilik Kost (Owner). Akun Staff tidak memiliki izin untuk mengelola atau melihat data pada menu ini.'
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-lg text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-full border border-rose-200 uppercase tracking-wider">
            403 • Forbidden
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
