'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { addBranch, deleteBranch } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'

export default function BranchList({ initialBranches, userRole }: { initialBranches: any[], userRole: string | null }) {
  const [branches, setBranches] = useState(initialBranches)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addState, addAction] = useActionState(addBranch, null)
  const [deleteState, deleteAction] = useActionState(deleteBranch, null)

  useEffect(() => {
    if (addState?.success) {
      setIsModalOpen(false)
      fetchBranches()
    }
  }, [addState])

  useEffect(() => {
    if (deleteState?.success) {
      fetchBranches()
    }
  }, [deleteState])

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*')
    setBranches(data || [])
  }

  const headers = userRole === 'owner' ? ['Name', 'Address', 'Action'] : ['Name', 'Address']
  const rows = branches.map(branch => {
    const row = [branch.name, branch.address]
    if (userRole === 'owner') {
      row.push(
        <form action={deleteAction} key={branch.id}>
          <input type="hidden" name="id" value={branch.id} />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Cabang</h1>
          <p className="text-gray-600">Kelola data cabang kost Anda</p>
        </div>
        {userRole === 'owner' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Cabang
          </button>
        )}
      </div>
      
      <Table headers={headers} rows={rows} />
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Cabang Baru</h2>
        <form action={addAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Cabang</label>
            <input 
              name="name" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              placeholder="Masukkan nama cabang" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat</label>
            <input 
              name="address" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              placeholder="Masukkan alamat cabang" 
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
              Tambah Cabang
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}