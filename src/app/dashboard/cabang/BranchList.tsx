'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { addBranch, deleteBranch } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function BranchList({ initialBranches }: { initialBranches: any[] }) {
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

  const headers = ['Name', 'Address', 'Action']
  const rows = branches.map(branch => [
    branch.name,
    branch.address,
    <form action={deleteAction} key={branch.id}>
      <input type="hidden" name="id" value={branch.id} />
      <button type="submit" className="text-red-500 hover:text-red-700">Delete</button>
    </form>
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Cabang Management</h1>
      <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Tambah Cabang</button>
      <Table headers={headers} rows={rows} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Tambah Cabang</h2>
        <form action={addAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input name="name" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan nama cabang" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input name="address" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan alamat cabang" />
          </div>
          {addState?.error && <p className="text-red-500 mb-4">{addState.error}</p>}
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Tambah</button>
        </form>
      </Modal>
    </div>
  )
}