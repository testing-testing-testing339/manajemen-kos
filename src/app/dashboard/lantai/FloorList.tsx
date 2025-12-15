'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { addFloor, deleteFloor } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'

export default function FloorList({ initialFloors, initialBranches, userRole }: { initialFloors: any[], initialBranches: any[], userRole: string | null }) {
  const [floors, setFloors] = useState(initialFloors)
  const [branches, setBranches] = useState(initialBranches)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addState, addAction] = useActionState(addFloor, null)
  const [deleteState, deleteAction] = useActionState(deleteFloor, null)
  const router = useRouter()

  // Sync state with props when they change (after refresh)
  useEffect(() => {
    setFloors(initialFloors)
    setBranches(initialBranches)
  }, [initialFloors, initialBranches])

  useEffect(() => {
    if (addState?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [addState, router])

  useEffect(() => {
    if (deleteState?.success) {
      router.refresh()
    }
  }, [deleteState, router])

  const headers = userRole === 'owner' ? ['Floor Name', 'Branch Name', 'Action'] : ['Floor Name', 'Branch Name']
  const rows = floors.map(floor => {
    const row = [floor.name, floor.branches?.name || 'Unknown']
    if (userRole === 'owner') {
      row.push(
        <form action={deleteAction} key={floor.id}>
          <input type="hidden" name="id" value={floor.id} />
          <SubmitButton
            variant="danger"
            className="px-4 py-2 text-sm font-medium"
            loadingText="Menghapus..."
          >
            Hapus
          </SubmitButton>
        </form>
      )
    }
    return row
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Lantai</h1>
          <p className="text-gray-600">Kelola data lantai untuk setiap cabang</p>
        </div>
        {userRole === 'owner' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Lantai
          </button>
        )}
      </div>
      
      <Table headers={headers} rows={rows} />
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Lantai Baru</h2>
        <form action={addAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cabang</label>
            <select 
              name="branch_id" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
              aria-label="Pilih cabang"
            >
              <option value="">Pilih Cabang</option>
              {branches.length === 0 ? (
                <option value="" disabled>Tidak ada cabang tersedia</option>
              ) : (
                branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))
              )}
            </select>
            {branches.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">Belum ada cabang. Silakan tambah cabang terlebih dahulu.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lantai</label>
            <input 
              name="name" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
              placeholder="Masukkan nama lantai" 
            />
          </div>
          {addState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{addState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <SubmitButton
              variant="primary"
              className="flex-1 px-4 py-3"
              loadingText="Menambahkan..."
            >
              Tambah Lantai
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}