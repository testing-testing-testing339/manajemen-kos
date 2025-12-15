'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createComplaint } from './actions'
import SubmitButton from '@/components/ui/SubmitButton'
import Modal from '@/components/ui/Modal'

export default function ComplaintForm({ tenant }: { tenant: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [state, formAction] = useActionState(createComplaint, null)
  const router = useRouter()

  // Close modal on success
  useEffect(() => {
    if (state?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [state, router])

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Buat Komplain Baru</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl"
          >
            + Buat Komplain
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Laporkan masalah dengan kamar atau fasilitas Anda. Tim kami akan segera menindaklanjuti.
        </p>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Buat Komplain Baru</h2>
        
        {state?.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="tenant_id" value={tenant.id} />
          <input type="hidden" name="room_id" value={tenant.room_id} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Judul Komplain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Contoh: Keran air bocor"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="plumbing">Pipa & Air</option>
              <option value="electrical">Listrik</option>
              <option value="cleaning">Kebersihan</option>
              <option value="furniture">Perabotan</option>
              <option value="security">Keamanan</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prioritas <span className="text-red-500">*</span>
            </label>
            <select
              name="priority"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="low">Rendah</option>
              <option value="medium" selected>Sedang</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deskripsi Masalah <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={5}
              placeholder="Jelaskan masalah yang Anda alami secara detail..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <SubmitButton
              variant="primary"
              className="flex-1"
              loadingText="Mengirim..."
            >
              Kirim Komplain
            </SubmitButton>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

