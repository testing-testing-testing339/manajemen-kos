'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createTenant, deleteTenant } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

export default function TenantList({ initialTenants, initialAvailableRooms }: { initialTenants: any[], initialAvailableRooms: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  const [availableRooms, setAvailableRooms] = useState(initialAvailableRooms)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
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
      setDeletingId(null)
      router.refresh()
      fetchTenants()
      fetchAvailableRooms()
    }
    if (deleteState?.error) {
      setDeletingId(null)
      alert(`Error: ${deleteState.error}`)
    }
  }, [deleteState, router])

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
      <form 
        action={deleteAction} 
        key={tenant.id} 
        className="inline-block"
        onSubmit={(e) => {
          if (!confirm(`Apakah Anda yakin ingin melakukan check-out untuk ${tenant.full_name}?`)) {
            e.preventDefault()
          } else {
            setDeletingId(tenant.id)
          }
        }}
      >
        <input type="hidden" name="id" value={tenant.id} />
        <button 
          type="submit" 
          disabled={deletingId === tenant.id}
          className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 font-medium transition-all duration-150 active:scale-95 active:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deletingId === tenant.id ? 'Memproses...' : 'Check-out'}
        </button>
      </form>
    ]
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Penghuni</h1>
          <p className="text-gray-600">Kelola data penghuni dan check-in/check-out</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Check-in Penghuni
        </button>
      </div>
      
      <Table headers={headers} rows={rows} />
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Check-in Penghuni Baru</h2>
        <form action={createAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kamar</label>
            <select 
              name="room_id" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              aria-label="Pilih kamar"
            >
              <option value="">Pilih Kamar</option>
              {availableRooms.length === 0 ? (
                <option value="" disabled>Tidak ada kamar tersedia</option>
              ) : (
                availableRooms.map(room => {
                  const label = `No. ${room.room_number} - ${room.floors?.branches?.name} (Rp ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.price)})`
                  return <option key={room.id} value={room.id}>{label}</option>
                })
              )}
            </select>
            {availableRooms.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">Tidak ada kamar yang tersedia untuk check-in.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
            <input 
              name="full_name" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan nama lengkap" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Link KTP / NIK</label>
            <input 
              name="id_card_url" 
              type="text" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan link KTP/NIK" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Masuk</label>
            <input 
              name="check_in_date" 
              type="date" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jatuh Tempo Pembayaran</label>
            <input 
              name="payment_due_date" 
              type="date" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meteran Listrik Awal</label>
            <input 
              name="electricity_meter_start" 
              type="number" 
              required 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
              placeholder="Masukkan meteran awal" 
            />
          </div>
          {createState?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{createState.error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-pink-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
            >
              Check-in
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}