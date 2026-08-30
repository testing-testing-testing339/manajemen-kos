'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createRoom, deleteRoom } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function RoomList({ initialRooms, initialFloors }: { initialRooms: any[], initialFloors: any[] }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [floors, setFloors] = useState(initialFloors)
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createState, createAction] = useActionState(createRoom, null)
  const [deleteState, deleteAction] = useActionState(deleteRoom, null)

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      fetchRooms()
    }
  }, [createState])

  useEffect(() => {
    if (deleteState?.success) {
      fetchRooms()
    }
  }, [deleteState])

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*, floors(name, branches(name))')
    setRooms(data || [])
  }

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*')
    setBranches(data || [])
  }

  const orderMap: Record<string, number> = {
    'vip belakang warkop': 1,
    'dasar': 2,
    'gedung atas lt 2': 3,
    'gedung atas lt 3': 4
  }

  const sortedRooms = [...rooms].sort((a, b) => {
    const floorA = orderMap[a.floors?.name?.toLowerCase().trim() || ''] || 99
    const floorB = orderMap[b.floors?.name?.toLowerCase().trim() || ''] || 99
    if (floorA !== floorB) return floorA - floorB
    const numA = parseInt(a.room_number?.toString().replace(/\D/g, '')) || 0
    const numB = parseInt(b.room_number?.toString().replace(/\D/g, '')) || 0
    return numA - numB
  })

  const filteredRooms = selectedBranch ? sortedRooms.filter(r => r.floors?.branches?.name === selectedBranch) : sortedRooms

  const headers = ['No. Kamar', 'Section / Lantai', 'Harga', 'Fasilitas', 'Catatan Kerusakan', 'Status', 'Actions']
  const rows = filteredRooms.map(room => {
    // Extract old style kondisi tag if no damage_notes exists yet
    const oldKondisi = room.facilities?.filter((f: string) => f.toLowerCase().startsWith('kondisi:')).map((f: string) => f.replace(/^kondisi:\s*/i, '')).join(', ') || ''
    const damageNotesDisplay = room.damage_notes || oldKondisi || '-'

    return [
      `Kamar ${room.room_number}`,
      room.floors?.name || 'Unknown',
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price),
      room.facilities?.filter((f: string) => !f.toLowerCase().startsWith('id pln:') && !f.toLowerCase().startsWith('kondisi:')).join(', ') || '',
      damageNotesDisplay,
      room.is_occupied ? 'Terisi' : 'Kosong',
      <form action={deleteAction} key={room.id}>
        <input type="hidden" name="id" value={room.id} />
        <button type="submit" className="text-red-500 hover:text-red-700 font-bold cursor-pointer">Delete</button>
      </form>
    ]
  })

  // Group floors by branch
  const floorsByBranch = branches.map(branch => ({
    ...branch,
    floors: floors.filter(f => f.branch_id === branch.id)
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manajemen Kamar</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded">Tambah Kamar</button>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Branch</label>
        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.name}>{branch.name}</option>
          ))}
        </select>
      </div>
      <Table headers={headers} rows={rows} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Tambah Kamar</h2>
        <form action={createAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Floor</label>
            <select name="floor_id" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" aria-label="Pilih lantai">
              <option value="">Select Floor</option>
              {floorsByBranch.map((branch: any) => (
                <optgroup key={branch.id} label={branch.name}>
                  {branch.floors.map((floor: any) => (
                    <option key={floor.id} value={floor.id}>{floor.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Room Number</label>
            <input name="room_number" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan nomor kamar" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Price</label>
            <input name="price" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan harga kamar" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Fasilitas</label>
            <textarea name="facilities" placeholder="Pisahkan dengan koma, misal: AC, Kasur" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Catatan Kerusakan / Kendala (Opsional)</label>
            <input name="damage_notes" type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Contoh: AC Mati, TV Rusak" />
          </div>
          {createState?.error && <p className="text-red-500 mb-4">{createState.error}</p>}
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Tambah</button>
        </form>
      </Modal>
    </div>
  )
}