'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { addFloor, deleteFloor } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function FloorList({ initialFloors }: { initialFloors: any[] }) {
  const [floors, setFloors] = useState(initialFloors)
  const [branches, setBranches] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addState, addAction] = useActionState(addFloor, null)
  const [deleteState, deleteAction] = useActionState(deleteFloor, null)

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (addState?.success) {
      setIsModalOpen(false)
      fetchFloors()
    }
  }, [addState])

  useEffect(() => {
    if (deleteState?.success) {
      fetchFloors()
    }
  }, [deleteState])

  const fetchFloors = async () => {
    const { data } = await supabase.from('floors').select('*, branches(name)')
    setFloors(data || [])
  }

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*')
    setBranches(data || [])
  }

  const headers = ['Floor Name', 'Branch Name', 'Action']
  const rows = floors.map(floor => [
    floor.name,
    floor.branches?.name || 'Unknown',
    <form action={deleteAction} key={floor.id}>
      <input type="hidden" name="id" value={floor.id} />
      <button type="submit" className="text-red-500 hover:text-red-700">Delete</button>
    </form>
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Lantai Management</h1>
      <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Tambah Lantai</button>
      <Table headers={headers} rows={rows} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Tambah Lantai</h2>
        <form action={addAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Branch</label>
            <select name="branch_id" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" aria-label="Pilih cabang">
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Floor Name</label>
            <input name="name" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan nama lantai" />
          </div>
          {addState?.error && <p className="text-red-500 mb-4">{addState.error}</p>}
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Tambah</button>
        </form>
      </Modal>
    </div>
  )
}