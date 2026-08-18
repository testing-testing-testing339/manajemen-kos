'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createTenant, deleteTenant } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function TenantList({ initialTenants, initialAvailableRooms }: { initialTenants: any[], initialAvailableRooms: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  const [availableRooms, setAvailableRooms] = useState(initialAvailableRooms)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createState, createAction] = useActionState(createTenant, null)
  const [deleteState, deleteAction] = useActionState(deleteTenant, null)

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      fetchTenants()
      fetchAvailableRooms()
    }
  }, [createState])

  useEffect(() => {
    if (deleteState?.success) {
      fetchTenants()
      fetchAvailableRooms()
    }
  }, [deleteState])

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*, rooms(room_number, floors(branches(name)))')
    setTenants(data || [])
  }

  const fetchAvailableRooms = async () => {
    const { data } = await supabase.from('rooms').select('*, floors(branches(name))').eq('is_occupied', false)
    setAvailableRooms(data || [])
  }

  const headers = ['Nama Penghuni', 'Kamar', 'Tgl Masuk', 'Jatuh Tempo', 'Meteran Awal', 'Actions']
  const rows = tenants.map(tenant => {
    const roomLabel = `No. ${tenant.rooms?.room_number} - ${tenant.rooms?.floors?.branches?.name}`
    const dueDate = new Date(tenant.payment_due_date)
    const isOverdue = dueDate < new Date()
    return [
      tenant.full_name,
      roomLabel,
      new Date(tenant.check_in_date).toLocaleDateString('id-ID'),
      <span key={tenant.id} className={isOverdue ? 'text-red-500 font-bold' : ''}>{dueDate.toLocaleDateString('id-ID')}</span>,
      tenant.electricity_meter_start,
      <form action={deleteAction} key={tenant.id}>
        <input type="hidden" name="id" value={tenant.id} />
        <button type="submit" className="text-red-500 hover:text-red-700">Check-out</button>
      </form>
    ]
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Data Penghuni</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded">Check-in Penghuni</button>
      </div>
      <Table headers={headers} rows={rows} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Check-in Penghuni</h2>
        <form action={createAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Room</label>
            <select name="room_id" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" aria-label="Pilih kamar">
              <option value="">Select Room</option>
              {availableRooms.map(room => {
                const label = `No. ${room.room_number} - ${room.floors?.branches?.name} (Rp ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price)})`
                return <option key={room.id} value={room.id}>{label}</option>
              })}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input name="full_name" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan nama lengkap" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Link KTP / NIK</label>
            <input name="id_card_url" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan link KTP/NIK" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Tanggal Masuk</label>
            <input name="check_in_date" type="date" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Pilih tanggal masuk" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Jatuh Tempo</label>
            <input name="payment_due_date" type="date" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Pilih tanggal jatuh tempo" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Meteran Listrik Awal</label>
            <input name="electricity_meter_start" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Masukkan meteran awal" />
          </div>
          {createState?.error && <p className="text-red-500 mb-4">{createState.error}</p>}
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Check-in</button>
        </form>
      </Modal>
    </div>
  )
}