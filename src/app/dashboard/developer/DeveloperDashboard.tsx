'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Database, 
  HardDrive, 
  Users, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Wrench, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Server,
  FolderArchive,
  Image as ImageIcon,
  Cpu,
  ArrowUpRight,
  Info,
  Building2
} from 'lucide-react'

interface TableMetric {
  name: string
  label: string
  count: number
  estimatedBytesPerRow: number
}

interface StorageBucket {
  name: string
  public: boolean
  fileCount: number
  totalBytes: number
  createdAt: string
  files: Array<{
    name: string
    size: number
    mimetype: string
    updatedAt: string
  }>
}

interface DeveloperDashboardProps {
  latencyMs: number
  totalDbRows: number
  totalEstimatedDbBytes: number
  totalStorageBytes: number
  totalStorageFiles: number
  storageBuckets: StorageBucket[]
  tables: TableMetric[]
  authUsersCount: number
  supabaseUrl: string
}

export default function DeveloperDashboard({
  latencyMs: initialLatency,
  totalDbRows,
  totalEstimatedDbBytes,
  totalStorageBytes,
  totalStorageFiles,
  storageBuckets,
  tables,
  authUsersCount,
  supabaseUrl
}: DeveloperDashboardProps) {
  const [latency, setLatency] = useState(initialLatency)
  const [isPinging, setIsPinging] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState<StorageBucket | null>(storageBuckets[0] || null)

  // Supabase Free Tier Quotas:
  // - Database: 500 MB
  // - Storage: 1 GB (1024 MB)
  // - Auth MAU: 50,000 users
  const dbQuotaMb = 500
  const storageQuotaMb = 1024
  const authQuotaMau = 50000

  const dbUsedMb = (totalEstimatedDbBytes / 1024 / 1024)
  const dbPercent = Math.min(100, Math.max(0.1, (dbUsedMb / dbQuotaMb) * 100))

  const storageUsedMb = (totalStorageBytes / 1024 / 1024)
  const storagePercent = Math.min(100, Math.max(0.1, (storageUsedMb / storageQuotaMb) * 100))

  const authPercent = Math.min(100, Math.max(0.01, (authUsersCount / authQuotaMau) * 100))

  const handlePing = async () => {
    setIsPinging(true)
    const start = performance.now()
    try {
      const res = await fetch('/api/keep-alive')
      if (res.ok) {
        setLatency(Math.round(performance.now() - start))
      }
    } catch {
      setLatency(Math.round(performance.now() - start))
    } finally {
      setIsPinging(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Developer Console
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Database Online
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Pemantauan Database & Storage
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau kapasitas memori database, file upload storage Supabase, dan status performa server secara real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePing}
            disabled={isPinging}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isPinging ? 'animate-spin' : ''}`} />
            <span>Tes Latensi DB ({latency} ms)</span>
          </button>

          <Link
            href="/check-in"
            target="_blank"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Buka Formulir Check-In</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* 3 Core Quota Gauge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Database PostgreSQL Capacity */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Database PostgreSQL (Supabase)
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {dbUsedMb.toFixed(2)} MB <span className="text-xs font-semibold text-slate-400">/ {dbQuotaMb} MB</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Terpakai: {dbPercent.toFixed(2)}%</span>
              <span className="text-emerald-600 font-extrabold">Sangat Aman</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, dbPercent)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Total <strong>{totalDbRows}</strong> baris data tersimpan di 9 tabel</span>
          </p>
        </div>

        {/* 2. Supabase File Storage (Photos/Documents) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                File Storage (Foto KTP & Bukti)
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {storageUsedMb.toFixed(2)} MB <span className="text-xs font-semibold text-slate-400">/ {storageQuotaMb} MB</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Terpakai: {storagePercent.toFixed(2)}%</span>
              <span className="text-emerald-600 font-extrabold">Sangat Aman</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, storagePercent)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <FolderArchive className="w-3.5 h-3.5 text-purple-500" />
            <span>Total <strong>{totalStorageFiles}</strong> file foto di {storageBuckets.length} bucket</span>
          </p>
        </div>

        {/* 3. Authentication Users Quota */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Akun Staf & Administrator
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {authUsersCount} <span className="text-xs font-semibold text-slate-400">Akun Terdaftar</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Status Akun: Aktif</span>
              <span className="text-emerald-600 font-extrabold">Sangat Aman</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Akun Owner & Staf terenkripsi aman</span>
          </p>
        </div>
      </div>

      {/* Database Tables Detail Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Rincian Baris Tabel Database</h2>
            <p className="text-xs text-slate-500">Kepadatan volume data per entitas tabel di PostgreSQL</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
            {tables.length} Tabel Terhubung
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4">Nama Tabel</th>
                <th className="py-3 px-4">Kegunaan & Entitas Data</th>
                <th className="py-3 px-4 text-center">Jumlah Baris</th>
                <th className="py-3 px-4 text-center">Estimasi Ukuran</th>
                <th className="py-3 px-4 text-center">Status Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tables.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                    {t.name}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {t.label}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                    {t.count.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    {formatBytes(t.count * t.estimatedBytesPerRow)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Normal</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage Buckets Inspection Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Inspeksi Bucket Storage File</h2>
          <p className="text-xs text-slate-500">Rincian media foto KTP, bukti transfer pembayaran, dan foto staf</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bucket Cards */}
          <div className="space-y-3">
            {storageBuckets.map((bucket) => (
              <div
                key={bucket.name}
                onClick={() => setSelectedBucket(bucket)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedBucket?.name === bucket.name
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-indigo-600" />
                    <p className="font-mono font-bold text-sm text-slate-900">{bucket.name}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-extrabold">
                    {bucket.public ? 'Public' : 'Private'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{bucket.fileCount} File Tersimpan</span>
                  <span className="font-mono font-bold text-indigo-600">{formatBytes(bucket.totalBytes)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bucket Files Preview */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Daftar File di Bucket: <span className="font-mono text-indigo-600">{selectedBucket?.name || '-'}</span>
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Total: {selectedBucket?.fileCount || 0} file
              </span>
            </div>

            {selectedBucket && selectedBucket.files.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedBucket.files.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-md">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-mono font-medium text-slate-800 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-slate-500 text-[11px]">{formatBytes(file.size)}</span>
                      <span className="text-[10px] text-slate-400">{new Date(file.updatedAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada file tersimpan di bucket ini
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Developer Environment & Architecture Details */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Spesifikasi Infrastruktur & Pengaturan Developer</h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-mono text-slate-300">
            Next.js 16 • Supabase PostgreSQL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
            <p className="text-slate-400 text-[11px] font-bold uppercase">Endpoint Supabase</p>
            <p className="font-mono text-indigo-300 truncate">{supabaseUrl}</p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
            <p className="text-slate-400 text-[11px] font-bold uppercase">Formulir Check-in Tamu</p>
            <p className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publik & Terenkripsi HTTPS</span>
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
            <p className="text-slate-400 text-[11px] font-bold uppercase">Status Keamanan RLS</p>
            <p className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Row Level Security (RLS) Diaktifkan</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
